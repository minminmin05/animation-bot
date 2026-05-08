/**
 * TTS Provider Interface
 * Defines the contract that all TTS providers must implement
 */

export type ProviderType = 'botnoi' | 'edge';

export interface TTSRequest {
  text: string;
  emotion: string;
}

export interface TTSResponse {
  audioBuffer: Buffer;
  contentType: string;
  extension: string;
}

export interface ProviderConfig {
  name: string;
  enabled: boolean;
  priority: number;
}

export interface ProviderHealth {
  isHealthy: boolean;
  lastCheck: Date;
  failureCount: number;
  lastError?: string;
  latency?: number;
}

export interface TTSProvider {
  /**
   * Generate speech from text
   * @param request - TTS request containing text and emotion
   * @returns Promise with audio buffer and metadata
   */
  generateSpeech(request: TTSRequest): Promise<TTSResponse>;

  /**
   * Check if provider is healthy and available
   * @returns Promise with health status
   */
  healthCheck(): Promise<ProviderHealth>;

  /**
   * Get provider configuration
   */
  getConfig(): ProviderConfig;

  /**
   * Get provider name for logging
   */
  getName(): string;
}
