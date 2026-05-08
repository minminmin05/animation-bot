/**
 * Edge-TTS Provider
 * Uses Microsoft Edge TTS via node-edge-tts package (working version)
 * Supports Thai voices with streaming capability
 */

import type { TTSProvider, TTSRequest, TTSResponse, ProviderHealth, ProviderConfig } from '../tts.interface.js';
import { EdgeTTS } from 'node-edge-tts';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// Edge-TTS Thai voices
const THAI_VOICES = {
  male: 'th-TH-NiwatNeural',
  female: 'th-TH-PremwadeeNeural'
};

// Emotion to voice mapping
const EMOTION_VOICE_MAP: Record<string, string> = {
  happy: THAI_VOICES.female,      // Cheerful female voice
  neutral: THAI_VOICES.male,       // Standard male voice
  concerned: THAI_VOICES.female,   // Serious female voice
  surprised: THAI_VOICES.female,
  sad: THAI_VOICES.female,
  helpful: THAI_VOICES.female,
  warning: THAI_VOICES.female
};

// Temp directory for processing
const TEMP_DIR = path.join(process.cwd(), 'cache/audio/temp');

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

export class EdgeTTSProvider implements TTSProvider {
  private health: ProviderHealth = {
    isHealthy: true,
    lastCheck: new Date(),
    failureCount: 0
  };

  getConfig(): ProviderConfig {
    return {
      name: 'edge',
      enabled: true, // Always enabled (no API key needed)
      priority: 2 // Lower priority than Botnoi (fallback)
    };
  }

  getName(): string {
    return 'Edge-TTS';
  }

  async healthCheck(): Promise<ProviderHealth> {
    const startTime = Date.now();

    try {
      // Simple test with minimal text
      const testFile = path.join(TEMP_DIR, `health-${Date.now()}.mp3`);
      const edgeTTS = new EdgeTTS({
        voice: THAI_VOICES.male,
        rate: '+0%',
        volume: '+0%'
      });

      await edgeTTS.ttsPromise('ทดสอบ', testFile);

      // Clean up test file
      if (fs.existsSync(testFile)) {
        fs.unlinkSync(testFile);
      }

      const latency = Date.now() - startTime;

      this.health = {
        isHealthy: true,
        lastCheck: new Date(),
        failureCount: 0,
        latency
      };
    } catch (error: any) {
      this.health = {
        isHealthy: false,
        lastCheck: new Date(),
        failureCount: this.health.failureCount + 1,
        lastError: error.message
      };
    }

    return this.health;
  }

  async generateSpeech(request: TTSRequest): Promise<TTSResponse> {
    const { text, emotion } = request;

    console.log(`[EdgeTTSProvider] Generating speech for: "${text.substring(0, 50)}..." [emotion: ${emotion}]`);

    const voice = EMOTION_VOICE_MAP[emotion] || THAI_VOICES.male;
    console.log(`[EdgeTTSProvider] Using voice: ${voice} for emotion: ${emotion}`);

    const startTime = Date.now();
    const tempFile = path.join(TEMP_DIR, `tts-${crypto.randomUUID()}.mp3`);

    try {
      // Use node-edge-tts package
      const edgeTTS = new EdgeTTS({
        voice,
        rate: '+0%',
        volume: '+0%'
      });

      await edgeTTS.ttsPromise(text, tempFile);

      if (!fs.existsSync(tempFile)) {
        throw new Error('Edge-TTS did not generate audio file');
      }

      const audioBuffer = fs.readFileSync(tempFile);

      // Clean up temp file
      fs.unlinkSync(tempFile);

      const latency = Date.now() - startTime;

      console.log(`[EdgeTTSProvider] Audio generated successfully (${audioBuffer.length} bytes, ${latency}ms)`);

      // Reset failure count on success
      this.health.failureCount = 0;
      this.health.latency = latency;

      return {
        audioBuffer,
        contentType: 'audio/mpeg', // Edge-TTS returns MP3
        extension: 'mp3'
      };
    } catch (error: any) {
      // Clean up temp file if exists
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }

      // Update health on error
      this.health.failureCount += 1;
      this.health.lastError = error.message;
      this.health.isHealthy = false;

      console.error(`[EdgeTTSProvider] Error:`, error.message);
      throw error;
    }
  }
}
