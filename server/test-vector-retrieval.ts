// Test vector retrieval with Thai query about school uniforms
import 'dotenv/config'
import { embed } from './embeddings/index.js'
import { searchByEmbedding } from './rag/services/supabase.service.js'

async function testVectorRetrieval() {
  const query = 'นักเรียนต้องสวมเครื่องแบบอะไรบ้าง'

  console.log('\n' + '='.repeat(70))
  console.log('🔍 TEST VECTOR RETRIEVAL')
  console.log('='.repeat(70))
  console.log(`Query: "${query}"`)
  console.log('='.repeat(70))

  // Step 1: Generate embedding
  console.log('\n[1/3] Generating embedding...')
  const embedding = await embed(query)
  console.log(`  ✓ Embedding generated: ${embedding.length} dimensions`)

  // Step 2: Perform similarity search (top 5)
  console.log('\n[2/3] Performing similarity search (top 5)...')

  // Get more results by calling with limit=5
  const results = await searchByEmbedding(embedding, 5, 0.3) // Lower threshold to get more results

  console.log(`  ✓ Retrieved ${results.length} results`)

  // Step 3: Log results
  console.log('\n[3/3] Results:')
  console.log('='.repeat(70))

  if (results.length === 0) {
    console.log('❌ No results found!')
    console.log('   Possible issues:')
    console.log('   - Database has no embeddings')
    console.log('   - Similarity threshold too high')
    console.log('   - Vector dimension mismatch')
  } else {
    results.forEach((result, index) => {
      const score = result.similarity * 100
      const scoreBar = '█'.repeat(Math.floor(score / 5))
      const scoreColor = result.similarity > 0.7 ? '🟢' : result.similarity > 0.5 ? '🟡' : '🔴'

      console.log(`\n${scoreColor} Result #${index + 1}`)
      console.log(`   Similarity: ${result.similarity.toFixed(4)} (${score.toFixed(1)}%)`)
      console.log(`   Score Bar:  [${scoreBar.padEnd(20, '░')}]`)
      console.log(`   Category:   ${result.category}`)
      console.log(`   Content:    ${result.content.substring(0, 80)}...`)
    })

    console.log('\n' + '='.repeat(70))

    // Summary
    const avgSimilarity = results.reduce((sum, r) => sum + r.similarity, 0) / results.length
    const highConfidence = results.filter(r => r.similarity > 0.7).length
    const mediumConfidence = results.filter(r => r.similarity > 0.5 && r.similarity <= 0.7).length
    const lowConfidence = results.filter(r => r.similarity <= 0.5).length

    console.log('📊 SUMMARY:')
    console.log(`   Total Results:     ${results.length}`)
    console.log(`   Avg Similarity:    ${(avgSimilarity * 100).toFixed(1)}%`)
    console.log(`   High (>0.7):       ${highConfidence} 🟢`)
    console.log(`   Medium (>0.5):     ${mediumConfidence} 🟡`)
    console.log(`   Low (<=0.5):       ${lowConfidence} 🔴`)

    // Check for relevant results
    const uniformRelated = results.some(r =>
      r.content.toLowerCase().includes('เครื่องแบบ') ||
      r.content.toLowerCase().includes('uniform') ||
      r.content.toLowerCase().includes('แต่งกาย')
    )

    console.log('\n🎯 RELEVANCE CHECK:')
    if (uniformRelated) {
      console.log('   ✅ Found relevant results about uniforms/dress code')
    } else {
      console.log('   ⚠️  May not have found uniform-specific content')
    }

    console.log('='.repeat(70))
  }
}

testVectorRetrieval().catch(console.error)
