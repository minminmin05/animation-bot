import { Request, Response } from 'express'
import { embed, getModelInfo } from '../embeddings/index.js'

/**
 * Test endpoint for embedding generation and similarity calculation
 * Supports Thai text for testing multilingual models
 */
export async function testEmbeddingSimilarity(req: Request, res: Response) {
  try {
    const { texts } = req.body

    console.log('[Embedding Test] Testing embeddings...')

    if (!texts || !Array.isArray(texts) || texts.length < 2) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Please provide at least 2 texts to compare'
      })
    }

    const modelInfo = getModelInfo()
    const startTime = Date.now()

    // Generate embeddings for all texts
    const embeddings: number[][] = []
    for (const text of texts) {
      const embedding = await embed(text)
      embeddings.push(embedding)
    }

    const generationTime = Date.now() - startTime

    // Calculate pairwise similarities
    const similarities: { pair: string[]; score: number }[] = []

    for (let i = 0; i < texts.length; i++) {
      for (let j = i + 1; j < texts.length; j++) {
        const similarity = cosineSimilarity(embeddings[i], embeddings[j])
        similarities.push({
          pair: [texts[i], texts[j]],
          score: similarity
        })
      }
    }

    res.json({
      success: true,
      model: {
        name: modelInfo.MODEL_NAME,
        dimensions: modelInfo.EMBEDDING_DIM
      },
      generationTime,
      embeddings: embeddings.map((emb, idx) => ({
        text: texts[idx],
        dimensions: emb.length,
        sample: emb.slice(0, 5)
      })),
      similarities
    })
  } catch (error) {
    console.error('[Embedding Test] Error:', error)
    res.status(500).json({
      error: 'Failed to test embeddings',
      message: String(error)
    })
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0)
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0))
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0))
  return dotProduct / (magnitudeA * magnitudeB)
}
