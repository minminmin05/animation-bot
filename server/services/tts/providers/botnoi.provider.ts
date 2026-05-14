/**
 * Botnoi TTS Provider
 * Refactored from existing tts.controller.ts implementation
 */

import type { TTSProvider, TTSRequest, TTSResponse, ProviderHealth, ProviderConfig } from '../tts.interface.js';

const BOTNOI_ENDPOINT = 'https://api-voice.botnoi.ai/api/service/generate_audio';
const BOTNOI_TOKEN = process.env.BOTNOI_API_KEY;

// Emotion to speaker ID mapping (preserved from original)
const EMOTION_SPEAKER_MAP: Record<string, string> = {
  happy: '2',      // Female, cheerful
  neutral: '1',    // Male, standard
  concerned: '3',  // Female, serious
  surprised: '2',
  sad: '3'
};

export class BotnoiProvider implements TTSProvider {
  private health: ProviderHealth = {
    isHealthy: true,
    lastCheck: new Date(),
    failureCount: 0
  };

  getConfig(): ProviderConfig {
    return {
      name: 'botnoi',
      enabled: !!BOTNOI_TOKEN && BOTNOI_TOKEN !== 'PUT_YOUR_API_KEY_HERE',
      priority: 1
    };
  }

  getName(): string {
    return 'Botnoi';
  }

  async healthCheck(): Promise<ProviderHealth> {
    const startTime = Date.now();

    if (!BOTNOI_TOKEN || BOTNOI_TOKEN === 'PUT_YOUR_API_KEY_HERE') {
      this.health = {
        isHealthy: false,
        lastCheck: new Date(),
        failureCount: this.health.failureCount + 1,
        lastError: 'API key not configured'
      };
      return this.health;
    }

    try {
      // Simple health check with minimal text
      const testResponse = await fetch(BOTNOI_ENDPOINT, {
        method: 'POST',
        headers: {
          'Botnoi-Token': BOTNOI_TOKEN,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: 'test',
          speaker: '1',
          volume: 1,
          speed: 1,
          type_media: 'm4a'
        })
      });

      const latency = Date.now() - startTime;

      if (testResponse.ok) {
        this.health = {
          isHealthy: true,
          lastCheck: new Date(),
          failureCount: 0,
          latency
        };
      } else {
        this.health = {
          isHealthy: false,
          lastCheck: new Date(),
          failureCount: this.health.failureCount + 1,
          lastError: `HTTP ${testResponse.status}`,
          latency
        };
      }
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

    console.log(`[BotnoiProvider] Generating speech for: "${text.substring(0, 50)}..." [emotion: ${emotion}]`);

    if (!BOTNOI_TOKEN || BOTNOI_TOKEN === 'PUT_YOUR_API_KEY_HERE') {
      throw new Error('Botnoi API Key not configured');
    }

    const speaker = EMOTION_SPEAKER_MAP[emotion] || '1';
    console.log(`[BotnoiProvider] Using speaker ID: ${speaker} for emotion: ${emotion}`);

    const startTime = Date.now();

    try {
      // Call Botnoi API
      const response = await fetch(BOTNOI_ENDPOINT, {
        method: 'POST',
        headers: {
          'Botnoi-Token': BOTNOI_TOKEN,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          speaker,
          volume: 1,
          speed: 1,
          type_media: 'm4a'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[BotnoiProvider] API Error Status: ${response.status}`, errorText);
        throw new Error(`Botnoi API failed: ${response.statusText} (${response.status})`);
      }

      const data = await response.json();

      if (!data.audio_url) {
        throw new Error('Botnoi API did not return audio_url');
      }

      console.log(`[BotnoiProvider] Downloading audio from: ${data.audio_url}`);

      // Download audio
      const audioResponse = await fetch(data.audio_url);
      if (!audioResponse.ok) {
        throw new Error(`Failed to download audio: ${audioResponse.statusText}`);
      }

      const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
      const latency = Date.now() - startTime;

      console.log(`[BotnoiProvider] Audio generated successfully (${audioBuffer.length} bytes, ${latency}ms)`);

      // Reset failure count on success
      this.health.failureCount = 0;
      this.health.latency = latency;

      return {
        audioBuffer,
        contentType: 'audio/x-m4a',
        extension: 'm4a'
      };
    } catch (error: any) {
      // Update health on error
      this.health.failureCount += 1;
      this.health.lastError = error.message;
      this.health.isHealthy = false;

      console.error(`[BotnoiProvider] Error:`, error.message);
      throw error;
    }
  }
}
