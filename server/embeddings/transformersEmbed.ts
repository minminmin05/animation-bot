/**
 * Local embedding using Transformers.js (@xenova/transformers)
 * This runs Sentence Transformers directly in Node.js without needing a separate API server.
 *
 * Default model: Xenova/all-MiniLM-L6-v2 (384 dimensions)
 * Alternative models for Thai/multilingual:
 * - Xenova/paraphrase-multilingual-MiniLM-L12-v2 (384 dimensions)
 */

import { pipeline, Pipeline } from '@xenova/transformers'

export const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2'
export const EMBEDDING_DIM = 384

// Lazy load the model to avoid startup delay
let embedder: Pipeline | null = null
let loadingPromise: Promise<Pipeline> | null = null

async function getEmbedder(): Promise<Pipeline> {
  if (embedder) {
    return embedder
  }

  if (loadingPromise) {
    return loadingPromise
  }

  loadingPromise = (async () => {
    console.log('[Transformers] Loading model (this may take a minute on first run)...')

    const model = process.env.TRANSFORMERS_MODEL || MODEL_NAME

    embedder = await pipeline('feature-extraction', model, {
      // Enable progress logging
      progress_callback: (data) => {
        if (data.status === 'progress') {
          const percent = data.progress ? Math.round(data.progress * 100) : 0
          process.stdout.write(`\r[Transformers] Downloading model: ${percent}%`)
        } else if (data.status === 'done') {
          console.log('\r[Transformers] Model downloaded successfully!           ')
        }
      }
    })

    console.log('[Transformers] Model loaded and ready!')

    return embedder
  })()

  return loadingPromise
}

/**
 * Generate embedding using Transformers.js
 * This runs locally in Node.js without external API calls
 */
export async function transformersEmbed(text: string): Promise<number[]> {
  try {
    const embedder = await getEmbedder()

    console.log('[Transformers] Generating embedding...')

    // Generate embedding
    const output = await embedder(text, {
      pooling: 'mean',
      normalize: true
    })

    // Convert Tensor to array
    const embedding = Array.from(output.data)

    console.log(`[Transformers] Generated ${embedding.length}-dim embedding`)

    if (embedding.length !== EMBEDDING_DIM) {
      console.warn(`[Transformers] Warning: Expected ${EMBEDDING_DIM} dimensions, got ${embedding.length}`)
    }

    return embedding
  } catch (error) {
    console.error('[Transformers] Error:', error)
    throw new Error('Failed to generate Transformers embedding')
  }
}

/**
 * Clear the loaded model from memory
 * Useful for testing or if you want to switch models
 */
export function clearModel() {
  embedder = null
  loadingPromise = null
  console.log('[Transformers] Model cleared from memory')
}

/**
 * Get info about the current model configuration
 */
export function getModelInfo() {
  return {
    modelName: process.env.TRANSFORMERS_MODEL || MODEL_NAME,
    dimensions: EMBEDDING_DIM,
    type: 'transformers-js'
  }
}
