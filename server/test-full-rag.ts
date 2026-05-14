// Test full RAG system with context-only constraint
import 'dotenv/config'
import { embed } from './embeddings/index.js'
import { searchByEmbedding } from './rag/services/supabase.service.js'
import { generateAnswer } from './rag/services/llm.service.js'

async function testFullRAG() {
  const question = 'นักเรียนต้องสวมเครื่องแบบอะไรบ้าง'

  console.log('\n' + '='.repeat(70))
  console.log('🧪 TEST FULL RAG SYSTEM (Context-Only)')
  console.log('='.repeat(70))
  console.log(`Question: "${question}"`)
  console.log('='.repeat(70))

  // Step 1: Generate embedding
  console.log('\n[1/3] Generating embedding for question...')
  const embedding = await embed(question)
  console.log(`  ✓ Generated ${embedding.length}-dim embedding`)

  // Step 2: Search knowledge base
  console.log('\n[2/3] Searching knowledge base (threshold=0.4)...')
  const sources = await searchByEmbedding(embedding, 5, 0.4)

  if (sources.length === 0) {
    console.log('  ✗ No sources found')
    console.log('\n' + '='.repeat(70))
    console.log('RESULT: No relevant context found')
    console.log('='.repeat(70))
    return
  }

  console.log(`  ✓ Found ${sources.length} relevant sources:`)
  sources.forEach((s, i) => {
    console.log(`    [${i + 1}] similarity=${(s.similarity * 100).toFixed(1)}% - ${s.content.substring(0, 50)}...`)
  })

  // Step 3: Generate answer using ONLY context
  console.log('\n[3/3] Generating answer from context...')
  const answer = await generateAnswer(question, sources)

  console.log('\n' + '='.repeat(70))
  console.log('ANSWER (Context-Only):')
  console.log('='.repeat(70))
  console.log(answer.text)
  console.log('='.repeat(70))
  console.log(`\nSources used: ${answer.sources.length}`)
  console.log('='.repeat(70))
}

testFullRAG().catch(console.error)
