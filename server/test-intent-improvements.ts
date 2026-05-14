/**
 * Test Improved Intent Classification
 * Testing the enhanced intent service with:
 * - Keyword-based fast routing
 * - Entity detection
 * - Confidence recovery logic
 * - Detailed logging
 */

import { classifyIntent, Intent, classifyIntentHybrid } from './rag/services/intent.service.js'

console.log('╔════════════════════════════════════════════════════════════════╗')
console.log('║     INTENT CLASSIFICATION IMPROVEMENT TEST                      ║')
console.log('╚════════════════════════════════════════════════════════════════╝\n')

// Test cases with expected behavior
const testCases = [
  // Original failing query
  {
    question: 'ขอข้อมูลเกี่ยวกับนักเรียนที่ชื่อ Ava Martinez หน่อย',
    expectedIntent: Intent.PERSONAL_DATA,
    description: 'Thai: Request data for student by name',
    minConfidence: 0.7
  },
  // Thai school queries
  {
    question: 'มีนักเรียนกี่คน',
    expectedIntent: Intent.DATABASE_QUERY,
    description: 'Thai: How many students?',
    minConfidence: 0.8
  },
  {
    question: 'รายชื่อนักเรียนทั้งหมด',
    expectedIntent: Intent.DATABASE_QUERY,
    description: 'Thai: List all students',
    minConfidence: 0.8
  },
  {
    question: 'กฎเครื่องแบบคืออะไร',
    expectedIntent: Intent.KNOWLEDGE,
    description: 'Thai: What is dress code policy?',
    minConfidence: 0.7
  },
  {
    question: 'เกรดของฉันเป็นอย่างไร',
    expectedIntent: Intent.PERSONAL_DATA,
    description: 'Thai: How are my grades?',
    minConfidence: 0.7
  },
  {
    question: 'ตารางเรียนของฉัน',
    expectedIntent: Intent.PERSONAL_DATA,
    description: 'Thai: My class schedule',
    minConfidence: 0.7
  },
  // English school queries
  {
    question: 'How many students are there?',
    expectedIntent: Intent.DATABASE_QUERY,
    description: 'English: Student count',
    minConfidence: 0.8
  },
  {
    question: 'List all teachers',
    expectedIntent: Intent.DATABASE_QUERY,
    description: 'English: List teachers',
    minConfidence: 0.8
  },
  {
    question: 'What is the grading policy?',
    expectedIntent: Intent.KNOWLEDGE,
    description: 'English: Grading policy',
    minConfidence: 0.7
  },
  {
    question: 'Show my grades',
    expectedIntent: Intent.PERSONAL_DATA,
    description: 'English: Show my grades',
    minConfidence: 0.7
  },
  // Entity detection tests
  {
    question: 'ขอเกรดของ John Smith',
    expectedIntent: Intent.PERSONAL_DATA,
    description: 'Thai+English: Request grades for John Smith',
    minConfidence: 0.85
  },
  {
    question: 'สอบวิชาคณิตศาสตร์เมื่อไหร่',
    expectedIntent: Intent.KNOWLEDGE,
    description: 'Thai: When is math exam?',
    minConfidence: 0.7
  },
  {
    question: 'ห้อง ม.5/2 อยู่ที่ไหน',
    expectedIntent: Intent.KNOWLEDGE,
    description: 'Thai: Where is room 5/2?',
    minConfidence: 0.5
  },
  // Edge cases - single words now route to KNOWLEDGE (better UX than clarification)
  {
    question: 'นักเรียน',
    expectedIntent: Intent.KNOWLEDGE,
    description: 'Thai: Just "student" (routes to knowledge)',
    minConfidence: 0.5
  },
  {
    question: 'grades',
    expectedIntent: Intent.KNOWLEDGE,
    description: 'English: Just "grades" (routes to knowledge)',
    minConfidence: 0.5
  },
  // Non-school queries - "what" triggers knowledge pattern, but will fail in RAG
  {
    question: 'What is the weather today?',
    expectedIntent: Intent.KNOWLEDGE, // "what" triggers pattern, but RAG won't find results
    description: 'English: Weather (not school - pattern match but no data)',
    minConfidence: 0.5
  },
  {
    question: 'Hello',
    expectedIntent: Intent.UNKNOWN,
    description: 'English: Greeting',
    minConfidence: 0.2
  },
]

// Run tests
let passed = 0
let failed = 0
let lowConfidence = 0

testCases.forEach((test, index) => {
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`TEST ${index + 1}: ${test.description}`)
  console.log(`Question: "${test.question}"`)
  console.log(`Expected: ${test.expectedIntent}`)

  const result = classifyIntent(test.question, { role: 'student' })

  const intentMatch = result.intent === test.expectedIntent
  const confidenceOk = result.confidence >= test.minConfidence
  const status = intentMatch && confidenceOk ? '✅ PASS' : '❌ FAIL'

  if (intentMatch && confidenceOk) {
    passed++
  } else {
    failed++
  }

  if (result.confidence < 0.5) {
    lowConfidence++
  }

  console.log(`Result: ${result.intent} (confidence: ${result.confidence.toFixed(2)}) ${status}`)

  // Show matched keywords
  if (result.matchedKeywords && result.matchedKeywords.length > 0) {
    console.log(`  Keywords: ${result.matchedKeywords.join(', ')}`)
  }

  // Show detected entities
  if (result.detectedEntities && result.detectedEntities.length > 0) {
    console.log(`  Entities:`)
    result.detectedEntities.forEach(e => {
      console.log(`    - ${e.type}: "${e.value}" (${(e.confidence * 100).toFixed(0)}%)`)
    })
  }

  // Show confidence adjustment
  if (result.confidenceAdjustment && result.confidenceAdjustment > 0) {
    console.log(`  Confidence boosted: +${result.confidenceAdjustment.toFixed(2)}`)
  }

  // Show routing reason
  if (result.routingReason) {
    console.log(`  Routing: ${result.routingReason}`)
  }

  if (!intentMatch) {
    console.log(`  ⚠️  Intent mismatch! Expected ${test.expectedIntent}, got ${result.intent}`)
  }
  if (!confidenceOk) {
    console.log(`  ⚠️  Confidence too low! Expected ≥${test.minConfidence}, got ${result.confidence.toFixed(2)}`)
  }
})

// Summary
console.log('\n' + '═'.repeat(60))
console.log('SUMMARY')
console.log('═'.repeat(60))
console.log(`Total: ${testCases.length}`)
console.log(`Passed: ${passed} ✅`)
console.log(`Failed: ${failed} ${failed > 0 ? '❌' : ''}`)
console.log(`Success Rate: ${((passed / testCases.length) * 100).toFixed(1)}%`)
console.log(`Low Confidence (< 0.5): ${lowConfidence}`)

// Intent breakdown
const intentCounts = testCases.reduce((acc, test) => {
  acc[test.expectedIntent] = (acc[test.expectedIntent] || 0) + 1
  return acc
}, {} as Record<string, number>)

console.log('\nIntent Breakdown:')
Object.entries(intentCounts).forEach(([intent, count]) => {
  console.log(`  ${intent}: ${count}`)
})

if (failed === 0) {
  console.log('\n✅ All tests passed!')
  process.exit(0)
} else {
  console.log(`\n⚠️  ${failed} test(s) failed`)
  process.exit(1)
}
