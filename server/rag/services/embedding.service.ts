/**
 * Embedding service - abstraction layer for switching between OpenAI and local embeddings
 *
 * This service now uses the new embeddings abstraction layer that allows switching
 * between OpenAI (text-embedding-3-small) and local Sentence Transformers.
 *
 * Configuration: Set USE_LOCAL_EMBEDDING=true in server/.env to use local embeddings.
 *
 * IMPORTANT: When switching providers, all existing embeddings must be regenerated.
 * OpenAI: 1536 dimensions | Local: typically 384 or 768 dimensions
 */

export { embed as generateEmbedding, getModelInfo, getEmbeddingConfig } from '../../embeddings/index.js'
