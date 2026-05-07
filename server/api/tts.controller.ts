import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cache directory
const CACHE_DIR = path.join(__dirname, '../../cache/audio');

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Botnoi API Config
const BOTNOI_ENDPOINT = 'https://api-voice.botnoi.ai/api/service/generate_audio';
const BOTNOI_TOKEN = process.env.BOTNOI_API_KEY;

// Speaker Mapping (Example)
const EMOTION_SPEAKER_MAP: Record<string, string> = {
  happy: '2', // Female, cheerful
  neutral: '1', // Male, standard
  concerned: '3', // Female, serious
  surprised: '2',
  sad: '3'
};

/**
 * Generate Speech using Botnoi API with Caching
 */
export const generateSpeech = async (req: Request, res: Response) => {
  try {
    const { text, emotion = 'neutral' } = req.body;
    console.log(`[TTS Controller] Received request: "${text?.substring(0, 50)}..." [Emotion: ${emotion}]`);

    if (!text) {
      console.warn('[TTS Controller] Missing text in request body');
      return res.status(400).json({ error: 'Text is required' });
    }

    if (!BOTNOI_TOKEN || BOTNOI_TOKEN === 'PUT_YOUR_API_KEY_HERE') {
      console.error('[TTS Controller] Botnoi API Key is missing or invalid in .env');
      return res.status(500).json({ error: 'Botnoi API Key not configured' });
    }

    // Generate hash for caching
    const hash = crypto.createHash('md5').update(`${text}_${emotion}`).digest('hex');
    const cachePath = path.join(CACHE_DIR, `${hash}.m4a`);

    // Check if cached
    if (fs.existsSync(cachePath)) {
      console.log(`[TTS Controller] Serving from cache: ${hash}`);
      res.setHeader('Content-Type', 'audio/x-m4a');
      return res.sendFile(cachePath);
    }

    console.log(`[TTS Controller] Generating new audio via Botnoi API...`);

    const speaker = EMOTION_SPEAKER_MAP[emotion] || '1';
    console.log(`[TTS Controller] Using speaker ID: ${speaker} for emotion: ${emotion}`);

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
      const errorData = await response.text();
      console.error('[TTS Controller] Botnoi API Error Status:', response.status);
      console.error('[TTS Controller] Botnoi API Error Data:', errorData);
      throw new Error(`Botnoi API failed: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[TTS Controller] Botnoi API Response:', JSON.stringify(data));
    
    // Botnoi returns { audio_url: "..." }
    if (!data.audio_url) {
      console.error('[TTS Controller] Botnoi API did not return audio_url. Full response:', data);
      throw new Error('Botnoi API did not return audio_url');
    }

    console.log(`[TTS Controller] Downloading audio from: ${data.audio_url}`);
    
    // Download and cache the audio
    const audioResponse = await fetch(data.audio_url);
    if (!audioResponse.ok) {
      throw new Error(`Failed to download audio from Botnoi URL: ${audioResponse.statusText}`);
    }

    const audioBuffer = await audioResponse.arrayBuffer();
    
    fs.writeFileSync(cachePath, Buffer.from(audioBuffer));
    console.log(`[TTS Controller] Audio successfully cached at: ${cachePath}`);
    
    // Return the file
    res.setHeader('Content-Type', 'audio/x-m4a');
    res.sendFile(cachePath);

  } catch (error: any) {
    console.error('[TTS Controller] Fatal Error:', error.message);
    res.status(500).json({ error: `Failed to generate speech: ${error.message}` });
  }
};
