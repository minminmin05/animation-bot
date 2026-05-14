// Load environment variables FIRST
import 'dotenv/config'

import { embed } from './embeddings/index.js'
import { getKnowledgeBaseWithNullEmbeddings, updateKnowledgeBaseEmbedding } from './rag/services/supabase.service.js'

async function main() {
  console.log('\n' + '='.repeat(60))
  console.log('🔧 FIXING NULL EMBEDDINGS')
  console.log('='.repeat(60))

  // Get all records with NULL embeddings
  const rows = await getKnowledgeBaseWithNullEmbeddings()

  console.log(`Found ${rows.length} records with NULL embeddings`)

  if (rows.length === 0) {
    console.log('✅ No NULL embeddings found. All records have embeddings.')
    return
  }

  let processed = 0
  let errors = 0

  for (const row of rows) {
    try {
      console.log(`\n[${processed + 1}/${rows.length}] Processing ID: ${row.id}`)
      console.log(`  Content: ${row.content?.slice(0, 60)}...`)

      // Generate embedding using Xenova/paraphrase-multilingual-MiniLM-L12-v2 (384 dim)
      const embedding = await embed(row.content)

      // Update the record
      await updateKnowledgeBaseEmbedding(row.id, embedding)

      console.log(`  ✅ Embedding generated (${embedding.length} dimensions) and stored`)
      processed++
    } catch (error: any) {
      console.error(`  ❌ Error: ${error.message}`)
      errors++
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log(`✅ Processed: ${processed} records`)
  if (errors > 0) {
    console.log(`❌ Errors: ${errors} records`)
  }
  console.log('='.repeat(60))

  // Verify no NULL embeddings remain
  const remainingNulls = await getKnowledgeBaseWithNullEmbeddings()
  if (remainingNulls.length === 0) {
    console.log('\n✅ Verification: No NULL embeddings remaining')
  } else {
    console.log(`\n⚠️  Warning: ${remainingNulls.length} NULL embeddings still remain`)
  }
}

main().catch(console.error)
