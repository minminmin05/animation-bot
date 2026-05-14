/**
 * Full RAG Pipeline Audit
 * This script audits the entire RAG pipeline step by step
 */

import 'dotenv/config'
import { generateEmbedding, getModelInfo } from './rag/services/embedding.service.js'
import { searchByEmbedding, getKnowledgeBase } from './rag/services/supabase.service.js'
import { generateAnswer } from './rag/services/llm.service.js'

// Test queries
const TEST_QUERIES = [
  'นักเรียนต้องสวมเครื่องแบบอะไรบ้างในวันปกติ',
  'กฎระเบียบเกี่ยวกับเครื่องแบบนักเรียนมีอะไรบ้าง'
]

console.log('='.repeat(60))
console.log('RAG PIPELINE AUDIT')
console.log('='.repeat(60))
console.log()

// ============================================================================
// STEP 1: Check Knowledge Base Data
// ============================================================================
console.log('STEP 1: Check Knowledge Base Data')
console.log('-'.repeat(60))

try {
  const kbData = await getKnowledgeBase()
  console.log(`✓ Total documents in knowledge_base: ${kbData.length}`)

  if (kbData.length === 0) {
    console.log('⚠️  WARNING: Knowledge base is EMPTY!')
    console.log('   No context can be retrieved without data.')
  } else {
    console.log('\nSample documents:')
    kbData.slice(0, 3).forEach((doc, i) => {
      console.log(`  ${i + 1}. [${doc.category || 'no category'}] ${doc.content.substring(0, 60)}...`)
    })
  }
} catch (error) {
  console.log(`✗ Error accessing knowledge base: ${error.message}`)
}

console.log()

// ============================================================================
// STEP 2: Test Embedding Generation
// ============================================================================
console.log('STEP 2: Test Embedding Generation')
console.log('-'.repeat(60))

try {
  const modelInfo = getModelInfo()
  console.log(`Model: ${modelInfo.MODEL_NAME}`)
  console.log(`Dimensions: ${modelInfo.EMBEDDING_DIM}`)

  for (const query of TEST_QUERIES) {
    console.log(`\nQuery: "${query}"`)
    const embedding = await generateEmbedding(query)

    console.log(`  ✓ Embedding generated`)
    console.log(`  ✓ Dimensions: ${embedding.length}`)
    console.log(`  ✓ First 5 values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}]`)

    // Verify normalization
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
    console.log(`  ✓ L2 Norm: ${norm.toFixed(6)} ${Math.abs(norm - 1) < 0.001 ? '(normalized)' : '(NOT normalized!)'}`)
  }
} catch (error) {
  console.log(`✗ Error generating embedding: ${error.message}`)
}

console.log()

// ============================================================================
// STEP 3-7: Test Full RAG Pipeline for Each Query
// ============================================================================
for (const query of TEST_QUERIES) {
  console.log('='.repeat(60))
  console.log(`FULL PIPELINE TEST: "${query}"`)
  console.log('='.repeat(60))

  // ============================================================================
  // STEP 3: Vector Search (Retrieval)
  // ============================================================================
  console.log('\nSTEP 3: Vector Search (Retrieval)')
  console.log('-'.repeat(60))

  let sources = []
  try {
    const embedding = await generateEmbedding(query)
    sources = await searchByEmbedding(embedding, 5, 0.1) // Low threshold to see all results

    console.log(`✓ Retrieved ${sources.length} chunks`)

    if (sources.length === 0) {
      console.log('⚠️  WARNING: No chunks retrieved!')
    } else {
      sources.forEach((source, i) => {
        console.log(`\n  Result ${i + 1}:`)
        console.log(`    Similarity: ${source.similarity.toFixed(4)}`)
        console.log(`    Category: ${source.category || 'none'}`)
        console.log(`    Content: "${source.content.substring(0, 80)}..."`)
      })
    }
  } catch (error) {
    console.log(`✗ Error during retrieval: ${error.message}`)
  }

  // ============================================================================
  // STEP 4: Filtering
  // ============================================================================
  console.log('\nSTEP 4: Filtering')
  console.log('-'.repeat(60))

  const THRESHOLD = 0.5
  const filtered = sources.filter(s => s.similarity > THRESHOLD)
  console.log(`Threshold: ${THRESHOLD}`)
  console.log(`Chunks before filter: ${sources.length}`)
  console.log(`Chunks after filter: ${filtered.length}`)

  if (filtered.length === 0 && sources.length > 0) {
    console.log('⚠️  WARNING: All chunks filtered out! No context will be passed to LLM.')
  }

  // ============================================================================
  // STEP 5: Context Injection (Build Prompt)
  // ============================================================================
  console.log('\nSTEP 5: Context Injection (Prompt Building)')
  console.log('-'.repeat(60))

  const context = filtered.map((s, i) => {
    const text = s.content || s.text || ''
    return `[${i + 1}] ${text}`
  }).join('\n')

  console.log(`Context chunks provided: ${filtered.length}`)

  if (context) {
    console.log('\n--- CONTEXT BEING SENT TO LLM ---')
    console.log(context.substring(0, 300) + (context.length > 300 ? '...' : ''))
    console.log('--- END CONTEXT ---\n')
  } else {
    console.log('⚠️  WARNING: No context being sent to LLM!')
  }

  // ============================================================================
  // STEP 6: LLM Response
  // ============================================================================
  console.log('STEP 6: LLM Response')
  console.log('-'.repeat(60))

  try {
    const response = await generateAnswer(query, filtered)

    console.log(`✓ LLM Response received`)
    console.log(`  Emotion: ${response.emotion}`)
    console.log(`  Sources returned: ${response.sources.length}`)

    console.log('\n--- LLM ANSWER ---')
    console.log(response.text)
    console.log('--- END ANSWER ---\n')

    // ============================================================================
    // STEP 7: Fallback Logic Check
    // ============================================================================
    console.log('STEP 7: Fallback Logic Check')
    console.log('-'.repeat(60))

    const hasFallback = response.text.includes('ไม่มีข้อมูล') || response.text.includes('โทษ')
    const usedContext = filtered.length > 0

    console.log(`Context available: ${usedContext ? 'YES' : 'NO'}`)
    console.log(`Fallback triggered: ${hasFallback ? 'YES' : 'NO'}`)

    if (usedContext && hasFallback) {
      console.log('⚠️  BUG: Fallback was used DESPITE having context!')
    } else if (!usedContext && !hasFallback) {
      console.log('⚠️  WARNING: LLM gave answer WITHOUT context (hallucination risk)')
    } else {
      console.log('✓ Fallback logic working correctly')
    }

  } catch (error) {
    console.log(`✗ Error getting LLM response: ${error.message}`)
  }

  console.log()
}

// ============================================================================
// Summary
// ============================================================================
console.log('='.repeat(60))
console.log('AUDIT SUMMARY')
console.log('='.repeat(60))
console.log()
console.log('Key findings to check:')
console.log('1. Is there data in the knowledge_base table?')
console.log('2. Are embeddings being generated with correct dimensions (384)?')
console.log('3. Is retrieval returning results with similarity scores?')
console.log('4. Are chunks being filtered by threshold (0.5)?')
console.log('5. Is context being passed to the LLM in the prompt?')
console.log('6. Is the LLM using the context in its response?')
console.log('7. Is fallback only triggered when no context exists?')
