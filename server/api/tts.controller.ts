/**
 * TTS Controller
 * Refactored to use provider-based architecture
 * Maintains backward compatibility with existing frontend
 */

import { Request, Response } from 'express';
import { generateSpeechWithFallback, getProvidersHealth, clearProviderHealthCache, getProviderHealthStatus } from '../services/tts/tts.service.js';

/**
 * Generate Speech using the configured provider with automatic fallback
 * POST /api/tts/generate
 * Body: { text: string, emotion?: string }
 *
 * Response: Audio file (audio/x-m4a or audio/mpeg)
 *
 * This endpoint maintains the exact same contract as the original implementation:
 * - Returns audio file directly (not JSON)
 * - Uses Content-Type header for audio format
 * - Supports emotion mapping
 * - Caches generated audio
 */
export const generateSpeech = async (req: Request, res: Response) => {
  try {
    const { text, emotion = 'neutral' } = req.body;

    console.log(`[TTS Controller] Received request. Text: "${text?.substring(0, 50)}..." [Emotion: ${emotion}]`);

    if (!text) {
      console.warn('[TTS Controller] Missing text in request body');
      return res.status(400).json({ error: 'Text is required' });
    }

    // Generate speech with automatic fallback
    const { filePath, contentType, providerUsed } = await generateSpeechWithFallback(text, emotion);

    // Check if TTS was skipped (no provider configured)
    if (providerUsed === 'none') {
      console.log('[TTS Controller] No TTS provider configured, returning empty response');
      return res.json({
        success: true,
        skipped: true,
        reason: 'No TTS provider configured'
      });
    }

    console.log(`[TTS Controller] Sending audio file (provider: ${providerUsed}, type: ${contentType})`);

    // Set content type based on provider response
    res.setHeader('Content-Type', contentType);

    // Send the file (preserving original behavior)
    return res.sendFile(filePath);

  } catch (error: any) {
    console.error('[TTS Controller] Fatal Error:', error.message);

    // Return JSON error instead of crashing
    return res.status(500).json({
      success: false,
      error: `Failed to generate speech: ${error.message}`,
      skipped: true
    });
  }
};

/**
 * Get health status of all TTS providers
 * GET /api/tts/health
 *
 * Returns: { providers: Array<{ name, healthy, latency }> }
 */
export const getTTSHealth = async (req: Request, res: Response) => {
  try {
    const healthStatus = await getProvidersHealth();
    const cacheStatus = getProviderHealthStatus();

    res.json({
      providers: healthStatus,
      healthCache: cacheStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[TTS Controller] Health check error:', error.message);
    res.status(500).json({ error: 'Failed to check provider health' });
  }
};

/**
 * Clear provider health cache (admin only)
 * POST /api/tts/health/reset
 *
 * Forces all providers to be re-enabled immediately
 */
export const resetTTSHealth = async (req: Request, res: Response) => {
  try {
    clearProviderHealthCache();
    res.json({
      success: true,
      message: 'Provider health cache cleared. All providers are now available.'
    });
  } catch (error: any) {
    console.error('[TTS Controller] Reset error:', error.message);
    res.status(500).json({ error: 'Failed to reset provider health' });
  }
};
