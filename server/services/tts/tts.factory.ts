/**
 * TTS Provider Factory
 * Manages provider instantiation and selection with fallback support
 */

import type { TTSProvider } from './tts.interface.js';
import type { ProviderType } from './tts.interface.js';
import { BotnoiProvider } from './providers/botnoi.provider.js';
import { EdgeTTSProvider } from './providers/edge.provider.js';

/**
 * Provider registry
 * Maps provider names to their implementations
 */
const PROVIDERS: Record<ProviderType, () => TTSProvider> = {
  botnoi: () => new BotnoiProvider(),
  edge: () => new EdgeTTSProvider()
};

/**
 * Get provider instance by type
 */
export function getProvider(type: ProviderType): TTSProvider {
  const providerFactory = PROVIDERS[type];

  if (!providerFactory) {
    throw new Error(`Unknown TTS provider: ${type}`);
  }

  return providerFactory();
}

/**
 * Get all available providers
 */
export function getAllProviders(): ProviderType[] {
  return Object.keys(PROVIDERS) as ProviderType[];
}

/**
 * Get all enabled providers (sorted by priority)
 */
export function getEnabledProviders(): TTSProvider[] {
  return getAllProviders()
    .map(type => getProvider(type))
    .filter(provider => provider.getConfig().enabled)
    .sort((a, b) => a.getConfig().priority - b.getConfig().priority);
}
