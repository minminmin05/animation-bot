import { generateEmbedding } from './services/embedding.service'
import { searchByEmbedding, getKnowledgeBase, insertKnowledgeBase } from './services/supabase.service'

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

export { generateEmbedding, searchByEmbedding }
