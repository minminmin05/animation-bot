/**
 * Embedding service - abstraction layer for switching between OpenAI and local embeddings
 *
 * This module lazily loads embedding providers to avoid initialization errors
 * when API keys are missing.
 */

import { localEmbed, MODEL_NAME as LOCAL_MODEL, EMBEDDING_DIM as LOCAL_DIM } from './localEmbed.js'

// Lazy import for OpenAI to avoid errors when API key is missing
let openaiModule: typeof import('./openaiEmbed.js') | null = null

async function getOpenAI() {
  if (!openaiModule) {
    openaiModule = await import('./openaiEmbed.js')
  }
  return openaiModule
}

/**
 * Get the current provider setting from environment
 * This is checked at runtime, not module load time
 *
 * DEFAULT: Local (Sentence Transformers) is used by default
 * - If USE_LOCAL_EMBEDDING is undefined → uses local (true)
 * - If USE_LOCAL_EMBEDDING='false' → uses OpenAI
 * - If USE_LOCAL_EMBEDDING='true' → uses local
 */
function getUseLocal(): boolean {
  const value = process.env.USE_LOCAL_EMBEDDING
  const useLocal = value !== 'false'  // Default to true unless explicitly set to 'false'

  if (value === undefined) {
    console.log('[Embedding] USE_LOCAL_EMBEDDING not set, using DEFAULT: local')
  } else {
    console.log(`[Embedding] USE_LOCAL_EMBEDDING=${value}, using: ${useLocal ? 'local' : 'openai'}`)
  }

  return useLocal
}

/**
 * Main embedding function that switches between OpenAI and local embeddings.
 *
 * DEFAULT PROVIDER: Local (Sentence Transformers)
 *
 * IMPORTANT: DO NOT mix embeddings from different models in the same search index!
 * - OpenAI (text-embedding-3-small): 1536 dimensions
 * - Local Sentence Transformers: typically 384 or 768 dimensions
 *
 * When switching providers, you must regenerate all embeddings in your database
 * using the new provider. The similarity search will fail if vectors have different dimensions.
 *
 * To regenerate: npm run regenerate-embeddings
 * To revert to OpenAI: Set USE_LOCAL_EMBEDDING=false in server/.env
 */
export async function embed(text: string): Promise<number[]> {
  const useLocal = getUseLocal()
  const provider = useLocal ? 'local' : 'openai'

  console.log(`[Embedding] Generating embedding with provider: ${provider}`)
  console.log(`[Embedding] Text length: ${text.length} characters`)

  try {
    let result: number[]

    if (useLocal) {
      result = await localEmbed(text)
    } else {
      const openai = await getOpenAI()
      result = await openai.openaiEmbed(text)
    }

    console.log(`[Embedding] Success: ${result.length}-dim vector from ${provider}`)
    return result
  } catch (error: any) {
    console.error(`[Embedding] Error with ${provider} provider:`, error)

    // If local fails and it's a connection error, provide helpful message
    if (useLocal && error.message?.includes('fetch')) {
      console.error('[Embedding] Local embedding API unreachable!')
      console.error('[Embedding] Make sure the local API server is running:')
      console.error('[Embedding]   - URL: ' + (process.env.LOCAL_EMBEDDING_URL || 'http://localhost:8000/embed'))
      console.error('[Embedding]   - To use OpenAI instead, set USE_LOCAL_EMBEDDING=false in .env')
    }

    throw error
  }
}

/**
 * Get current model info - checks environment at runtime
 */
export function getModelInfo() {
  const USE_LOCAL = getUseLocal()

  // OpenAI constants - defined here to avoid import issues
  const OPENAI_MODEL = 'text-embedding-3-small'
  const OPENAI_DIM = 1536

  return {
    MODEL_NAME: USE_LOCAL ? LOCAL_MODEL : OPENAI_MODEL,
    EMBEDDING_DIM: USE_LOCAL ? LOCAL_DIM : OPENAI_DIM
  }
}

/**
 * Get the current embedding configuration
 * This always checks the current environment variable
 */
export function getEmbeddingConfig() {
  const USE_LOCAL = getUseLocal()
  const info = getModelInfo()

  console.log(`[Embedding Config] provider=${USE_LOCAL ? 'local' : 'openai'}, model=${info.MODEL_NAME}, dim=${info.EMBEDDING_DIM}`)

  return {
    provider: USE_LOCAL ? 'local' : 'openai',
    modelName: info.MODEL_NAME,
    dimensions: info.EMBEDDING_DIM,
    USE_LOCAL
  }
}

/**
 * Set the embedding provider programmatically
 * This is used by the API to switch providers at runtime
 */
export function setEmbeddingProvider(provider: 'openai' | 'local') {
  const newValue = provider === 'local' ? 'true' : 'false'
  process.env.USE_LOCAL_EMBEDDING = newValue
  console.log(`[Embedding] Provider changed to: ${provider} (USE_LOCAL_EMBEDDING=${newValue})`)
}
