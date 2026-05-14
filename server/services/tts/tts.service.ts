/**
 * TTS Service
 * Main service that orchestrates TTS providers with fallback support
 * Reads provider selection from database (system_settings.tts_provider)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';
import type { ProviderType } from './tts.interface.js';
import type { TTSRequest } from './tts.interface.js';
import { getProvider, getEnabledProviders } from './tts.factory.js';
import { supabase } from '../supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cache directory (preserved from original)
const CACHE_DIR = path.join(__dirname, '../../../cache/audio');

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Provider health cache for temporary disabling
const PROVIDER_FAILURE_THRESHOLD = 3;
const PROVIDER_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
const providerHealthCache = new Map<string, { disabledUntil: number; failureCount: number }>();

/**
 * Get current TTS provider from database
 * Falls back to 'empty' if not set (no voice model by default)
 */
export async function getCurrentProvider(): Promise<ProviderType> {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('tts_provider')
      .eq('id', 'settings')
      .single();

    if (error || !data) {
      console.warn('[TTS Service] Could not fetch tts_provider from database, using default: empty');
      return 'empty';
    }

    const provider = (data.tts_provider as ProviderType) || 'empty';
    console.log(`[TTS Service] Current provider from database: ${provider}`);
    return provider;
  } catch (error) {
    console.error('[TTS Service] Error fetching provider from database:', error);
    return 'empty';
  }
}

/**
 * Check if provider is temporarily disabled due to failures
 */
function isProviderDisabled(providerName: string): boolean {
  const health = providerHealthCache.get(providerName);
  if (!health) return false;

  if (health.disabledUntil > Date.now()) {
    console.log(`[TTS Service] Provider "${providerName}" is disabled until ${new Date(health.disabledUntil).toISOString()} (${health.failureCount} failures)`);
    return true;
  }

  // Reset if cooldown expired
  providerHealthCache.delete(providerName);
  return false;
}

/**
 * Mark provider as failed
 */
function markProviderFailure(providerName: string) {
  const health = providerHealthCache.get(providerName) || { failureCount: 0, disabledUntil: 0 };

  health.failureCount += 1;

  if (health.failureCount >= PROVIDER_FAILURE_THRESHOLD) {
    health.disabledUntil = Date.now() + PROVIDER_COOLDOWN_MS;
    console.warn(`[TTS Service] Provider "${providerName}" reached ${health.failureCount} failures. Disabling for ${PROVIDER_COOLDOWN_MS / 1000} seconds.`);
  }

  providerHealthCache.set(providerName, health);
}

/**
 * Reset provider health (for manual recovery or successful request)
 */
function resetProviderHealth(providerName: string) {
  providerHealthCache.delete(providerName);
}

/**
 * Generate speech with automatic fallback
 * @param text - Text to convert to speech
 * @param emotion - Emotion for voice selection
 * @param preferredProvider - Optional preferred provider (overrides database)
 * @returns Promise with audio file path and content type
 */
export async function generateSpeechWithFallback(
  text: string,
  emotion: string,
  preferredProvider?: ProviderType
): Promise<{ filePath: string; contentType: string; providerUsed: string }> {

  // Determine which provider to use
  const providerType = preferredProvider || await getCurrentProvider();

  // Check if TTS is disabled (empty provider) - return empty result instead of throwing
  if (providerType === 'empty') {
    console.log('[TTS Service] No TTS provider configured, skipping audio generation');
    // Return a marker that indicates TTS was skipped
    return {
      filePath: '',
      contentType: '',
      providerUsed: 'none'
    };
  }

  const primaryProvider = getProvider(providerType);
  const primaryName = primaryProvider.getName();

  console.log(`[TTS Service] Generating speech with provider: ${primaryName}`);

  // Generate cache hash (include provider for proper cache separation)
  const hash = crypto.createHash('md5').update(`${providerType}_${text}_${emotion}`).digest('hex');

  // Determine file extension based on provider
  const extension = providerType === 'edge' ? 'mp3' : 'm4a';
  const cachePath = path.join(CACHE_DIR, `${hash}.${extension}`);

  // Check cache first
  if (fs.existsSync(cachePath)) {
    console.log(`[TTS Service] Serving from cache: ${hash}`);
    const contentType = providerType === 'edge' ? 'audio/mpeg' : 'audio/x-m4a';
    return { filePath: cachePath, contentType, providerUsed: primaryName };
  }

  // Try primary provider (if not disabled)
  if (!isProviderDisabled(primaryName)) {
    try {
      const result = await primaryProvider.generateSpeech({ text, emotion });

      // Cache the audio
      fs.writeFileSync(cachePath, result.audioBuffer);

      // Reset health on success
      resetProviderHealth(primaryName);

      console.log(`[TTS Service] Successfully generated audio with ${primaryName}`);
      return { filePath: cachePath, contentType: result.contentType, providerUsed: primaryName };

    } catch (error: any) {
      console.error(`[TTS Service] Primary provider "${primaryName}" failed:`, error.message);
      markProviderFailure(primaryName);
    }
  } else {
    console.warn(`[TTS Service] Primary provider "${primaryName}" is disabled, trying fallback...`);
  }

  // Fallback to other enabled providers
  const fallbackProviders = getEnabledProviders().filter(p => p.getName() !== primaryName);

  if (fallbackProviders.length === 0) {
    throw new Error('All TTS providers are unavailable');
  }

  console.log(`[TTS Service] Initiating fallback sequence. Available providers: ${fallbackProviders.map(p => p.getName()).join(', ')}`);

  for (const fallbackProvider of fallbackProviders) {
    const fallbackName = fallbackProvider.getName();

    if (isProviderDisabled(fallbackName)) {
      console.log(`[TTS Service] Skipping disabled fallback provider: ${fallbackName}`);
      continue;
    }

    try {
      console.log(`[TTS Service] Trying fallback provider: ${fallbackName}`);

      const result = await fallbackProvider.generateSpeech({ text, emotion });

      // Generate new cache hash for fallback provider
      const fallbackHash = crypto.createHash('md5').update(`${fallbackName.toLowerCase()}_${text}_${emotion}`).digest('hex');
      const fallbackExtension = result.extension;
      const fallbackCachePath = path.join(CACHE_DIR, `${fallbackHash}.${fallbackExtension}`);

      // Cache the audio
      fs.writeFileSync(fallbackCachePath, result.audioBuffer);

      // Reset health on success
      resetProviderHealth(fallbackName);

      console.log(`[TTS Service] === FALLBACK SUCCESSFUL === Used "${fallbackName}" after "${primaryName}" failed`);
      return { filePath: fallbackCachePath, contentType: result.contentType, providerUsed: fallbackName };

    } catch (error: any) {
      console.error(`[TTS Service] Fallback provider "${fallbackName}" also failed:`, error.message);
      markProviderFailure(fallbackName);
    }
  }

  // All providers failed
  throw new Error('All TTS providers failed. Please try again later.');
}

/**
 * Get health status of all providers
 */
export async function getProvidersHealth(): Promise<Array<{ name: string; healthy: boolean; latency?: number }>> {
  const providers = getEnabledProviders();
  const healthStatus = await Promise.all(
    providers.map(async (provider) => {
      try {
        const health = await provider.healthCheck();
        return {
          name: provider.getName(),
          healthy: health.isHealthy,
          latency: health.latency
        };
      } catch {
        return {
          name: provider.getName(),
          healthy: false
        };
      }
    })
  );

  return healthStatus;
}

/**
 * Clear provider health cache (for admin recovery)
 */
export function clearProviderHealthCache(): void {
  providerHealthCache.clear();
  console.log('[TTS Service] Provider health cache cleared');
}

/**
 * Get provider health cache status (for debugging)
 */
export function getProviderHealthStatus(): Record<string, { disabled: boolean; failureCount: number; disabledUntil?: string }> {
  const status: Record<string, any> = {};

  for (const [name, health] of providerHealthCache.entries()) {
    status[name] = {
      disabled: health.disabledUntil > Date.now(),
      failureCount: health.failureCount,
      disabledUntil: health.disabledUntil > Date.now() ? new Date(health.disabledUntil).toISOString() : undefined
    };
  }

  return status;
}
