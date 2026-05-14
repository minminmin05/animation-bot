/**
 * Test node-edge-tts alternative package
 */

import { EdgeTTS } from 'node-edge-tts';
import * as fs from 'fs';
import * as path from 'path';

async function testNodeEdgeTTS() {
  console.log('=== Testing node-edge-tts package ===\n');

  // Ensure cache directory exists
  const cacheDir = 'cache/audio';
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  try {
    // Test 1: Thai text
    console.log('Test 1: Thai TTS - "สวัสดีครับ"');
    const edgeTTS1 = new EdgeTTS({
      voice: 'th-TH-NiwatNeural',
      rate: '+0%',
      volume: '+0%'
    });

    const outputPath1 = path.join(cacheDir, 'test-node-edge-thai.mp3');
    await edgeTTS1.ttsPromise('สวัสดีครับ', outputPath1);

    const stats1 = fs.statSync(outputPath1);
    console.log(`✓ Success! Generated ${stats1.size} bytes`);
    console.log(`✓ Saved to: ${outputPath1}`);

  } catch (error: any) {
    console.error(`✗ Failed: ${error.message}`);
    console.error(`  Error details:`, error.cause || error.code || 'N/A');
  }

  try {
    // Test 2: English text (baseline)
    console.log('\nTest 2: English TTS - "Hello world"');
    const edgeTTS2 = new EdgeTTS({
      voice: 'en-US-JennyNeural',
      rate: '+0%',
      volume: '+0%'
    });

    const outputPath2 = path.join(cacheDir, 'test-node-edge-english.mp3');
    await edgeTTS2.ttsPromise('Hello world', outputPath2);

    const stats2 = fs.statSync(outputPath2);
    console.log(`✓ Success! Generated ${stats2.size} bytes`);
    console.log(`✓ Saved to: ${outputPath2}`);

  } catch (error: any) {
    console.error(`✗ Failed: ${error.message}`);
  }

  console.log('\n=== Summary ===');
  console.log('If tests pass, node-edge-tts is a working alternative to edge-tts');
}

testNodeEdgeTTS().catch(console.error);
