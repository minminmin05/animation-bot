import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { getSystemSettings } from './settings.controller.js';

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
 * Generate Speech using the selected provider
 */
export const generateSpeech = async (req: Request, res: Response) => {
  try {
    const { text, emotion = 'neutral' } = req.body;
    
    // Get current TTS provider from settings
    const settings = await getSystemSettings();
    const provider = settings.tts_provider || 'botnoi';
    
    console.log(`[TTS Controller] Provider: ${provider}, Text: "${text?.substring(0, 50)}..." [Emotion: ${emotion}]`);

    if (!text) {
      console.warn('[TTS Controller] Missing text in request body');
      return res.status(400).json({ error: 'Text is required' });
    }

    // Generate hash for caching (include provider in hash)
    const hash = crypto.createHash('md5').update(`${provider}_${text}_${emotion}`).digest('hex');
    const cachePath = path.join(CACHE_DIR, `${hash}.m4a`);

    // Check if cached
    if (fs.existsSync(cachePath)) {
      console.log(`[TTS Controller] Serving from cache: ${hash}`);
      res.setHeader('Content-Type', 'audio/x-m4a');
      return res.sendFile(cachePath);
    }

    // Route to appropriate provider
    if (provider === 'botnoi') {
      return await handleBotnoiTTS(text, emotion, cachePath, res);
    } else {
      // Fallback or placeholder for other providers
      console.warn(`[TTS Controller] Provider "${provider}" not fully implemented yet. Falling back to Botnoi.`);
      return await handleBotnoiTTS(text, emotion, cachePath, res);
    }

  } catch (error: any) {
    console.error('[TTS Controller] Fatal Error:', error.message);
    res.status(500).json({ error: `Failed to generate speech: ${error.message}` });
  }
};

/**
 * Handle Botnoi TTS Generation
 */
async function handleBotnoiTTS(text: string, emotion: string, cachePath: string, res: Response) {
  if (!BOTNOI_TOKEN || BOTNOI_TOKEN === 'PUT_YOUR_API_KEY_HERE') {
    console.error('[TTS Controller] Botnoi API Key is missing or invalid in .env');
    return res.status(500).json({ error: 'Botnoi API Key not configured' });
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
    throw new Error(`Botnoi API failed: ${response.statusText}`);
  }

  const data = await response.json();
  
  if (!data.audio_url) {
    throw new Error('Botnoi API did not return audio_url');
  }

  console.log(`[TTS Controller] Downloading audio from: ${data.audio_url}`);
  
  const audioResponse = await fetch(data.audio_url);
  if (!audioResponse.ok) {
    throw new Error(`Failed to download audio from Botnoi URL: ${audioResponse.statusText}`);
  }

  const audioBuffer = await audioResponse.arrayBuffer();
  fs.writeFileSync(cachePath, Buffer.from(audioBuffer));
  
  res.setHeader('Content-Type', 'audio/x-m4a');
  res.sendFile(cachePath);
}
