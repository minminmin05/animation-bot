/**
 * Test script for Transformers embedding model
 * This tests the local embedding service directly
 */

import { embed, getEmbeddingConfig } from './embeddings/index.js'

async function testEmbedding() {
  console.log('=================================')
  console.log('TRANSFORMERS EMBEDDING TEST')
  console.log('=================================\n')

  // Check current configuration
  const config = getEmbeddingConfig()
  console.log('Current Configuration:')
  console.log(`  Provider: ${config.provider}`)
  console.log(`  Model: ${config.modelName}`)
  console.log(`  Dimensions: ${config.dimensions}`)
  console.log(`  Local API URL: ${process.env.LOCAL_EMBEDDING_URL || 'http://localhost:8000/embed'}`)
  console.log()

  if (config.provider !== 'local') {
    console.log('⚠️  Warning: Not using local embeddings!')
    console.log('   Set USE_LOCAL_EMBEDDING=true in .env to test Transformers\n')
  }

  // Test cases
  const testTexts = [
    'Hello world',
    'ทดสอบระบบภาษาไทย',
    'กฎการแต่งตัวนักเรียนคืออะไร'
  ]

  console.log('Running embedding tests...\n')

  for (let i = 0; i < testTexts.length; i++) {
    const text = testTexts[i]
    console.log(`Test ${i + 1}: "${text}"`)

    try {
      const startTime = Date.now()
      const embedding = await embed(text)
      const duration = Date.now() - startTime

      console.log(`  ✅ Success!`)
      console.log(`  Dimensions: ${embedding.length}`)
      console.log(`  Time: ${duration}ms`)
      console.log(`  First 5 values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}]`)
      console.log()

      // Verify dimensions match expected
      if (embedding.length !== config.dimensions) {
        console.log(`  ⚠️  Warning: Expected ${config.dimensions} dimensions, got ${embedding.length}`)
      }
    } catch (error) {
      console.log(`  ❌ Failed: ${error.message}`)
      console.log()
    }
  }

  // Test similarity calculation
  console.log('Testing similarity calculation...')
  try {
    const text1 = 'นักเรียนต้องสวมเครื่องแบบ'
    const text2 = 'เครื่องแบบนักเรียนมีอะไรบ้าง'
    const text3 = 'อาหารกลางวันมีเมนูอะไร'

    const emb1 = await embed(text1)
    const emb2 = await embed(text2)
    const emb3 = await embed(text3)

    function cosineSimilarity(a: number[], b: number[]): number {
      const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0)
      const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0))
      const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0))
      return dotProduct / (magnitudeA * magnitudeB)
    }

    const sim12 = cosineSimilarity(emb1, emb2)
    const sim13 = cosineSimilarity(emb1, emb3)
    const sim23 = cosineSimilarity(emb2, emb3)

    console.log(`  "${text1}" vs "${text2}": ${sim12.toFixed(4)}`)
    console.log(`  "${text1}" vs "${text3}": ${sim13.toFixed(4)}`)
    console.log(`  "${text2}" vs "${text3}": ${sim23.toFixed(4)}`)
    console.log()

    if (sim12 > sim13 && sim12 > sim23) {
      console.log('  ✅ Similarity test PASSED! Related texts have higher similarity.')
    } else {
      console.log('  ⚠️  Similarity results unexpected - check model quality')
    }
  } catch (error) {
    console.log(`  ❌ Similarity test failed: ${error.message}`)
  }

  console.log('\n=================================')
  console.log('TEST COMPLETE')
  console.log('=================================')
}

testEmbedding().catch(console.error)
