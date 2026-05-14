/**
 * Direct test of EdgeTTSProvider
 */

import { EdgeTTSProvider } from './services/tts/providers/edge.provider.js';

async function testProvider() {
  console.log('=== Testing EdgeTTSProvider directly ===\n');

  const provider = new EdgeTTSProvider();

  console.log('Provider name:', provider.getName());
  console.log('Config:', provider.getConfig());

  console.log('\n--- Health check ---');
  const health = await provider.healthCheck();
  console.log('Health result:', health);

  console.log('\n--- Generate speech ---');
  try {
    const result = await provider.generateSpeech({
      text: 'สวัสดีครับ',
      emotion: 'neutral'
    });

    console.log('✓ Success!');
    console.log('  Content type:', result.contentType);
    console.log('  Extension:', result.extension);
    console.log('  Buffer size:', result.audioBuffer.length);

    // Save to file for verification
    const fs = await import('fs');
    fs.writeFileSync('cache/audio/provider-test.mp3', result.audioBuffer);
    console.log('  Saved to: cache/audio/provider-test.mp3');

  } catch (error: any) {
    console.error('✗ Failed:', error.message);
    console.error('  Stack:', error.stack);
  }
}

testProvider().catch(console.error);
