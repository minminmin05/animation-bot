/**
 * TTS Service to interact with the backend TTS generation endpoint
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

/**
 * Generate audio from text
 * @param {string} text - The text to speak
 * @param {string} emotion - The emotion for speaker selection
 * @returns {Promise<string>} - The URL of the generated audio
 */
export const generateSpeech = async (text, emotion = 'neutral') => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tts/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text, emotion })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate speech');
    }

    // The backend returns the audio file directly
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('[TTS Service] Error:', error);
    throw error;
  }
};

/**
 * Pre-generate speech (optional, for queueing)
 */
export const pregenerateSpeech = async (text, emotion) => {
  // Similar to generateSpeech but doesn't return the URL if just warming cache
  return generateSpeech(text, emotion);
};
