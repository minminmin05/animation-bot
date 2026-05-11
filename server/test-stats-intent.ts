import { classifyIntent, Intent } from './rag/services/intent.service.js'

console.log('=== Statistics Questions Intent Test ===\n')

const testQuestions = [
  'มีนักเรียนกี่คน',
  'โรงเรียนมีนักเรียนทั้งหมดกี่คน',
  'มีครูกี่คน',
  'จำนวนนักเรียนทั้งหมด',
  'how many students',
  'how many students in school',
  'นักเรียนกี่คน',
]

testQuestions.forEach(q => {
  const result = classifyIntent(q, { role: 'student' })
  console.log(`Question: "${q}"`)
  console.log(`  Intent: ${result.intent}`)
  console.log(`  Confidence: ${result.confidence.toFixed(2)}`)
  console.log(`  Reasoning: ${result.reasoning}`)
  console.log('')
})
