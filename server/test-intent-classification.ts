import { classifyIntent, Intent, LLM_FALLBACK_THRESHOLD } from './rag/services/intent.service.js'

console.log('=== Intent Classification Test (with AMBIGUOUS) ===\n')

// Test cases including ambiguous queries
const testCases = [
  // KNOWLEDGE cases (clear intent)
  { question: 'กฎเครื่องแบบคืออะไร', expectedIntent: Intent.KNOWLEDGE, description: 'Thai: What is the dress code policy?', minConfidence: 0.6 },
  { question: 'What is the grading policy?', expectedIntent: Intent.KNOWLEDGE, description: 'English: Grading policy', minConfidence: 0.6 },
  { question: 'How is GPA calculated?', expectedIntent: Intent.KNOWLEDGE, description: 'English: How GPA works', minConfidence: 0.6 },
  { question: 'เกรดเฉลี่ยคืออะไร', expectedIntent: Intent.KNOWLEDGE, description: 'Thai: What is GPA?', minConfidence: 0.5 },
  { question: 'When is spring break?', expectedIntent: Intent.KNOWLEDGE, description: 'English: Spring break dates', minConfidence: 0.5 },
  { question: 'วันหยุดเปิดเทอมเมื่อไหร่', expectedIntent: Intent.KNOWLEDGE, description: 'Thai: When is semester break', minConfidence: 0.5 },

  // PERSONAL_DATA cases (clear intent with personal pronouns)
  { question: 'เกรดของฉันเป็นอย่างไร', expectedIntent: Intent.PERSONAL_DATA, description: 'Thai: How are my grades?', minConfidence: 0.5 },
  { question: 'Show my grades', expectedIntent: Intent.PERSONAL_DATA, description: 'English: Show my grades', minConfidence: 0.5 },
  { question: 'เกรดของฉัน', expectedIntent: Intent.PERSONAL_DATA, description: 'Thai: My grades (short)', minConfidence: 0.5 },
  { question: 'How many days have I missed?', expectedIntent: Intent.PERSONAL_DATA, description: 'English: Attendance query', minConfidence: 0.5 },
  { question: 'ผลการเรียนของฉัน', expectedIntent: Intent.PERSONAL_DATA, description: 'Thai: My academic results', minConfidence: 0.5 },
  { question: 'How is my GPA?', expectedIntent: Intent.PERSONAL_DATA, description: 'English: My GPA', minConfidence: 0.4 },

  // AMBIGUOUS cases (could be either)
  { question: 'grades', expectedIntent: Intent.AMBIGUOUS, description: 'English: Just "grades"', minConfidence: 0.3 },
  { question: 'เกรด', expectedIntent: Intent.AMBIGUOUS, description: 'Thai: Just "เกรด"', minConfidence: 0.3 },
  { question: 'attendance', expectedIntent: Intent.AMBIGUOUS, description: 'English: Just "attendance"', minConfidence: 0.3 },
  { question: 'การมาเรียน', expectedIntent: Intent.AMBIGUOUS, description: 'Thai: Just "การมาเรียน"', minConfidence: 0.3 },
  { question: 'exam', expectedIntent: Intent.AMBIGUOUS, description: 'English: Just "exam"', minConfidence: 0.3 },
  { question: 'สอบ', expectedIntent: Intent.AMBIGUOUS, description: 'Thai: Just "สอบ"', minConfidence: 0.3 },
  { question: 'class', expectedIntent: Intent.AMBIGUOUS, description: 'English: Just "class"', minConfidence: 0.3 },
  { question: 'วิชา', expectedIntent: Intent.AMBIGUOUS, description: 'Thai: Just "วิชา"', minConfidence: 0.3 },

  // UNKNOWN cases (not school-related or unclear)
  { question: 'Hello', expectedIntent: Intent.UNKNOWN, description: 'English: Greeting', minConfidence: 0 },
  { question: 'What is the weather?', expectedIntent: Intent.UNKNOWN, description: 'English: Weather (not school)', minConfidence: 0 },
]

let passed = 0
let failed = 0
let lowConfidence = 0
let ambiguousCount = 0

testCases.forEach((test, index) => {
  const result = classifyIntent(test.question, { role: 'student' })
  const intentMatch = result.intent === test.expectedIntent
  const confidenceOk = result.confidence >= test.minConfidence
  const status = intentMatch && confidenceOk ? '✅ PASS' : '❌ FAIL'

  if (intentMatch && confidenceOk) {
    passed++
  } else {
    failed++
  }

  if (result.confidence < LLM_FALLBACK_THRESHOLD) {
    lowConfidence++
  }

  if (result.intent === Intent.AMBIGUOUS) {
    ambiguousCount++
  }

  const llmFlag = result.confidence < LLM_FALLBACK_THRESHOLD ? ' 🔄 LLM' : ''
  const ambFlag = result.intent === Intent.AMBIGUOUS ? ' ❓ AMBIGUOUS' : ''

  console.log(`${status} Test ${index + 1}: ${test.description}`)
  console.log(`   Question: "${test.question}"`)
  console.log(`   Expected: ${test.expectedIntent} | Got: ${result.intent} (confidence: ${result.confidence.toFixed(2)})${llmFlag}${ambFlag}`)
  console.log(`   Reasoning: ${result.reasoning}`)
  if (result.clarificationQuestion) {
    console.log(`   Clarification: "${result.clarificationQuestion}"`)
  }
  console.log()
})

console.log('=== Results ===')
console.log(`Total: ${testCases.length}`)
console.log(`Passed: ${passed}`)
console.log(`Failed: ${failed}`)
console.log(`Success Rate: ${((passed / testCases.length) * 100).toFixed(1)}%`)
console.log(`Ambiguous: ${ambiguousCount} (will ask clarification)`)
console.log(`Low Confidence (< ${LLM_FALLBACK_THRESHOLD}): ${lowConfidence} (will trigger LLM fallback)`)

// Intent breakdown
const intentCounts = testCases.reduce((acc, test) => {
  acc[test.expectedIntent] = (acc[test.expectedIntent] || 0) + 1
  return acc
}, {} as Record<string, number>)
console.log(`\nIntent Breakdown:`)
Object.entries(intentCounts).forEach(([intent, count]) => {
  console.log(`  ${intent}: ${count}`)
})

if (failed === 0) {
  console.log('\n✅ All tests passed!')
} else {
  console.log(`\n⚠️  ${failed} test(s) failed`)
  process.exit(1)
}
