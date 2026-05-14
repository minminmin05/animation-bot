/**
 * Comprehensive Test Suite
 * Testing intent-to-action mapping and Supabase queries
 */

import { detectDataAction, DataAction } from './services/action-mapper.service.js'
import { classifyIntent, Intent } from './rag/services/intent.service.js'

console.log('╔════════════════════════════════════════════════════════════════╗')
console.log('║     INTENT-TO-ACTION MAPPING & SUPABASE QUERY TEST               ║')
console.log('╚════════════════════════════════════════════════════════════════╝\n')

const testQueries = [
  // Test 1: Original failing query - should map to STUDENT_PROFILE, not SCHEDULE
  {
    id: 1,
    query: 'ขอข้อมูลเกี่ยวกับนักเรียนที่ชื่อ Ava Martinez หน่อย',
    expectedIntent: Intent.PERSONAL_DATA,
    expectedAction: 'GET_STUDENT_PROFILE',
    description: 'Thai: Request general info about student Ava Martinez (NOT schedule)'
  },
  // Test 2: Grade query
  {
    id: 2,
    query: 'เกรดของ Ava Martinez',
    expectedIntent: Intent.PERSONAL_DATA,
    expectedAction: 'GET_GRADES',
    description: 'Thai: Request grades for Ava Martinez'
  },
  // Test 3: Attendance query
  {
    id: 3,
    query: 'การเข้าเรียนของ Ava Martinez',
    expectedIntent: Intent.PERSONAL_DATA,
    expectedAction: 'GET_ATTENDANCE',
    description: 'Thai: Request attendance for Ava Martinez'
  },
  // Test 4: Tuition query
  {
    id: 4,
    query: 'ค่าเทอมของ Ava Martinez',
    expectedIntent: Intent.PERSONAL_DATA,
    expectedAction: 'GET_PAYMENTS',
    description: 'Thai: Request tuition for Ava Martinez'
  },
  // Test 5: Schedule query (different keywords)
  {
    id: 5,
    query: 'ตารางเรียนของ Ava Martinez',
    expectedIntent: Intent.PERSONAL_DATA,
    expectedAction: 'GET_SCHEDULE',
    description: 'Thai: Request schedule for Ava Martinez (using "ตารางเรียน")'
  },
  // Test 6: Another schedule variant
  {
    id: 6,
    query: 'Ava Martinez',
    expectedIntent: Intent.PERSONAL_DATA,
    expectedAction: 'GET_STUDENT_PROFILE',
    description: 'Thai: Just name - should default to student profile'
  },
  // Test 7: English schedule query
  {
    id: 7,
    query: 'class schedule for Ava Martinez',
    expectedIntent: Intent.PERSONAL_DATA,
    expectedAction: 'GET_SCHEDULE',
    description: 'English: Request schedule for Ava Martinez'
  },
]

interface TestResult {
  id: number
  query: string
  intentResult: Intent
  actionResult: DataAction
  intentMatch: boolean
  actionMatch: boolean
  passed: boolean
}

const results: TestResult[] = []

function runTest(testCase: any) {
  console.log(`\n${'─'.repeat(70)}`)
  console.log(`TEST ${testCase.id}: ${testCase.description}`)
  console.log(`Query: "${testCase.query}"`)
  console.log()

  // Step 1: Intent Classification
  const intentResult = classifyIntent(testCase.query, { role: 'admin' })
  console.log(`[Intent] Result: ${intentResult.intent}`)
  console.log(`[Intent] Confidence: ${intentResult.confidence.toFixed(2)}`)
  console.log(`[Intent] Reasoning: ${intentResult.reasoning}`)

  // Step 2: Action Detection
  const personEntity = intentResult.detectedEntities?.find(e => e.type === 'person_name')
  const personName = personEntity?.value || null

  const actionResult = detectDataAction(testCase.query, personName)
  console.log(`[Action] Result: ${actionResult.action}`)
  console.log(`[Action] Confidence: ${actionResult.confidence.toFixed(2)}`)
  console.log(`[Action] Reasoning: ${actionResult.reasoning}`)

  // Step 3: Validation
  const intentMatch = intentResult.intent === testCase.expectedIntent
  const actionMatch = actionResult.action === testCase.expectedAction
  const passed = intentMatch && actionMatch

  const status = passed ? '✅ PASS' : '❌ FAIL'
  console.log(`\n${status} Intent: ${intentMatch ? 'MATCH' : 'MISMATCH'} (expected ${testCase.expectedIntent})`)
  console.log(`${status} Action: ${actionMatch ? 'MATCH' : 'MISMATCH'} (expected ${testCase.expectedAction})`)

  if (!intentMatch) {
    console.log(`  ⚠️  Intent: Expected ${testCase.expectedIntent}, got ${intentResult.intent}`)
  }
  if (!actionMatch) {
    console.log(`  ⚠️  Action: Expected ${testCase.expectedAction}, got ${actionResult.action}`)
  }

  results.push({
    id: testCase.id,
    query: testCase.query,
    intentResult: intentResult.intent,
    actionResult: actionResult.action,
    intentMatch,
    actionMatch,
    passed
  })

  return passed
}

// Run all tests
let passedCount = 0
let failedCount = 0

for (const test of testQueries) {
  if (runTest(test)) {
    passedCount++
  } else {
    failedCount++
  }
}

// Summary
console.log('\n' + '═'.repeat(70))
console.log('TEST SUMMARY')
console.log('═'.repeat(70))
console.log(`Total Tests: ${testQueries.length}`)
console.log(`Passed: ${passedCount} ✅`)
console.log(`Failed: ${failedCount} ${failedCount > 0 ? '❌' : ''}`)
console.log(`Success Rate: ${((passedCount / testQueries.length) * 100).toFixed(1)}%`)

// Detailed breakdown
console.log('\nDETAILED RESULTS:')
console.log('─'.repeat(70))

results.forEach(r => {
  const status = r.passed ? '✅' : '❌'
  const intentStatus = r.intentMatch ? '✓' : '✗'
  const actionStatus = r.actionMatch ? '✓' : '✗'
  console.log(`${status} Test ${r.id}: Intent:${intentStatus} ${r.intentResult} | Action:${actionStatus} ${r.actionResult}`)
  console.log(`   Query: "${r.query}"`)
})

console.log('─'.repeat(70))

// Action breakdown
console.log('\nACTION BREAKDOWN:')
const actionCounts = results.reduce((acc, r) => {
  acc[r.actionResult] = (acc[r.actionResult] || 0) + 1
  return acc
}, {} as Record<string, number>)

Object.entries(actionCounts).forEach(([action, count]) => {
  console.log(`  ${action}: ${count}`)
})

if (failedCount === 0) {
  console.log('\n✅ All tests passed!')
  process.exit(0)
} else {
  console.log(`\n⚠️  ${failedCount} test(s) failed`)
  process.exit(1)
}
