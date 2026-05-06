import { generateEmbedding } from './services/embedding.service'
import {
  searchByEmbedding,
  getKnowledgeBase,
  insertKnowledgeBase,
  getKnowledgeBaseWithNullEmbeddings,
  updateKnowledgeBaseEmbedding
} from './services/supabase.service'

export async function regenerateEmbeddings() {
  const rows = await getKnowledgeBase()

  console.log(`Found ${rows.length} documents to regenerate embeddings for`)

  for (const row of rows) {
    const embedding = await generateEmbedding(row.content)
    await insertKnowledgeBase({
      id: row.id,
      content: row.content,
      category: row.category,
      embedding
    })
    console.log(`✓ Regenerated embedding for: ${row.content?.slice(0, 40)}...`)
  }

  return { regenerated: rows.length }
}

/**
 * Fix NULL embeddings - generates embeddings for records that have NULL embedding
 */
export async function fixNullEmbeddings() {
  const rows = await getKnowledgeBaseWithNullEmbeddings()

  console.log(`Found ${rows.length} documents with NULL embeddings`)

  if (rows.length === 0) {
    console.log('✅ No NULL embeddings found')
    return { processed: 0, errors: 0 }
  }

  let processed = 0
  let errors = 0

  for (const row of rows) {
    try {
      console.log(`[${processed + 1}/${rows.length}] Processing: ${row.content?.slice(0, 40)}...`)

      const embedding = await generateEmbedding(row.content)
      await updateKnowledgeBaseEmbedding(row.id, embedding)

      console.log(`  ✓ Generated ${embedding.length}-dim embedding`)
      processed++
    } catch (error: any) {
      console.error(`  ✗ Error: ${error.message}`)
      errors++
    }
  }

  return { processed, errors }
}

/**
 * Insert knowledge base content with automatic embedding generation
 * If embedding is not provided, it will be generated automatically
 */
export async function insertKnowledgeBaseWithEmbedding(data: {
  content: string
  category?: string
  title?: string
  metadata?: Record<string, any>
  embedding?: number[]
}) {
  // Generate embedding if not provided
  const embedding = data.embedding || await generateEmbedding(data.content)

  await insertKnowledgeBase({
    content: data.content,
    category: data.category,
    title: data.title,
    metadata: data.metadata,
    embedding
  })

  return { success: true, embeddingGenerated: !data.embedding }
}

export { generateEmbedding, searchByEmbedding }
