/**
 * Standalone Edge-TTS Test
 * Debug the 403 issue
 */

import { tts, getVoices } from 'edge-tts';

async function testGetVoices() {
  console.log('=== Test 1: Get Available Voices ===');
  try {
    const voices = await getVoices();
    console.log(`✓ Got ${voices.length} voices`);

    // Find Thai voices
    const thaiVoices = voices.filter((v: any) => v.Locale.startsWith('th-TH'));
    console.log(`✓ Found ${thaiVoices.length} Thai voices:`);
    thaiVoices.forEach((v: any) => console.log(`  - ${v.ShortName} (${v.Gender}): ${v.FriendlyName}`));

    return true;
  } catch (error: any) {
    console.error(`✗ Failed: ${error.message}`);
    return false;
  }
}

async function testThaiTTS() {
  console.log('\n=== Test 2: Thai Text-to-Speech ===');
  try {
    console.log('Generating audio for: "สวัสดีครับ"');

    const audioBuffer = await tts('สวัสดีครับ', {
      voice: 'th-TH-NiwatNeural',
      rate: '+0%',
      volume: '+0%'
    });

    console.log(`✓ Success! Generated ${audioBuffer.length} bytes of audio`);
    console.log(`✓ Audio format: MP3 (expected)`);

    // Save to file for manual verification
    const fs = await import('fs');
    const testFile = 'cache/audio/test-edge-tts.mp3';
    fs.writeFileSync(testFile, audioBuffer);
    console.log(`✓ Saved to: ${testFile}`);

    return true;
  } catch (error: any) {
    console.error(`✗ Failed: ${error.message}`);
    console.error(`  Error code: ${error.code || 'N/A'}`);
    console.error(`  Stack: ${error.stack?.split('\n')[0]}`);
    return false;
  }
}

async function testEnglishTTS() {
  console.log('\n=== Test 3: English Text-to-Speech (baseline) ===');
  try {
    console.log('Generating audio for: "Hello world"');

    const audioBuffer = await tts('Hello world', {
      voice: 'en-US-JennyNeural',
      rate: '+0%',
      volume: '+0%'
    });

    console.log(`✓ Success! Generated ${audioBuffer.length} bytes of audio`);

    return true;
  } catch (error: any) {
    console.error(`✗ Failed: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('Edge-TTS Debug Test');
  console.log('=====================\n');

  const results = {
    getVoices: await testGetVoices(),
    thaiTTS: await testThaiTTS(),
    englishTTS: await testEnglishTTS()
  };

  console.log('\n=== Summary ===');
  console.log(`Get Voices: ${results.getVoices ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`Thai TTS: ${results.thaiTTS ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`English TTS: ${results.englishTTS ? '✓ PASS' : '✗ FAIL'}`);

  if (!results.thaiTTS || !results.englishTTS) {
    console.log('\n=== Diagnosis ===');
    console.log('If ALL tests fail: Microsoft is blocking the requests');
    console.log('  - Check network/firewall settings');
    console.log('  - Check if VPS IP is blocked by Microsoft');
    console.log('  - The hardcoded token might be expired');
    console.log('\nIf ONLY Thai fails: Thai voice model might be unavailable');
  }
}

main().catch(console.error);
