/**
 * Test Edge-TTS as primary provider (bypass database)
 */

import { generateSpeechWithFallback } from './services/tts/tts.service.js';

async function testEdgeAsPrimary() {
  console.log('=== Testing Edge-TTS as Primary Provider ===\n');

  try {
    // Force Edge-TTS as primary (bypass database)
    const result = await generateSpeechWithFallback('ทดสอบเสียง', 'neutral', 'edge');

    console.log('✓ Success!');
    console.log('  File path:', result.filePath);
    console.log('  Content type:', result.contentType);
    console.log('  Provider used:', result.providerUsed);

    const fs = await import('fs');
    const stats = fs.statSync(result.filePath);
    console.log('  File size:', stats.size, 'bytes');

  } catch (error: any) {
    console.error('✗ Failed:', error.message);
    console.error('  Stack:', error.stack);
  }
}

testEdgeAsPrimary().catch(console.error);
