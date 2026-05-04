import { pipeline } from '@xenova/transformers'

let embeddingModel: any = null

export async function getModel() {
  if (!embeddingModel) {
    console.log('[Embedding] Loading all-MiniLM-L6-v2 model (first run downloads ~80MB)...')
    embeddingModel = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2'
    )
    console.log('[Embedding] Model loaded successfully')
  }
  return embeddingModel
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const model = await getModel()
  const output = await model(text, { pooling: 'mean', normalize: true })
  return Array.from(output.data)
}

export const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2'
export const EMBEDDING_DIM = 384
