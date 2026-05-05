import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const MODEL = 'text-embedding-3-small'
export const MODEL_NAME = MODEL
export const EMBEDDING_DIM = 1536

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    console.log('[Embedding] Generating embedding with OpenAI...')

    const response = await openai.embeddings.create({
      model: MODEL,
      input: text,
      dimensions: EMBEDDING_DIM
    })

    const embedding = response.data[0].embedding

    console.log('[Embedding] Generated successfully')

    return embedding
  } catch (error) {
    console.error('[Embedding] Error:', error)
    throw new Error('Failed to generate embedding')
  }
}
