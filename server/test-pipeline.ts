/**
 * Pipeline Service Integration Test
 *
 * Tests the complete new architecture:
 * Core → Handlers → Repositories → Pipeline
 */

import 'dotenv/config'
import { createHandlerRegistry } from './handlers/index.js'
import { PipelineService, type PipelineRequest } from './pipeline/index.js'
import { Action } from './core/handlers/handler.interface.js'

console.log('╔════════════════════════════════════════════════════════════════╗')
console.log('║     PIPELINE SERVICE INTEGRATION TEST                          ║')
console.log('╚════════════════════════════════════════════════════════════════╝\n')

// Initialize handler registry
console.log('[Test] Initializing handler registry...')
const registry = createHandlerRegistry()

// Create pipeline service
console.log('[Test] Creating pipeline service...')
const pipeline = new PipelineService(registry, {
  debug: true,
  enableLLM: false // Disable LLM for faster testing
})

console.log('[Test] Handlers registered:', registry.getStats())
console.log('[Test] Available actions:', registry.getActions())
console.log('')

// Test cases
const testCases: PipelineRequest[] = [
  // Test 1: Intent classification - personal data
  {
    query: 'ขอข้อมูลเกี่ยวกับนักเรียนที่ชื่อ Ava Martinez หน่อย',
    userId: 'test-user-1',
    userRole: 'admin'
  },

  // Test 2: Grades query
  {
    query: 'เกรดของ Ava Martinez',
    userId: 'test-user-1',
    userRole: 'admin'
  },

  // Test 3: Attendance query
  {
    query: 'การมาเรียนของ Ava Martinez',
    userId: 'test-user-1',
    userRole: 'admin'
  },

  // Test 4: Schedule query
  {
    query: 'ตารางเรียนของ Ava Martinez',
    userId: 'test-user-1',
    userRole: 'admin'
  },

  // Test 5: Statistics query
  {
    query: 'มีนักเรียนกี่คน',
    userId: 'test-user-1',
    userRole: 'admin'
  },

  // Test 6: Knowledge query
  {
    query: 'กฎเครื่องแบบคืออะไร',
    userId: 'test-user-1',
    userRole: 'student'
  },

  // Test 7: List query
  {
    query: 'รายชื่อนักเรียนทั้งหมด',
    userId: 'test-user-1',
    userRole: 'admin'
  },

  // Test 8: English query
  {
    query: 'How many students are there?',
    userId: 'test-user-1',
    userRole: 'admin'
  },

  // Test 9: English grade query
  {
    query: 'Show grades for Ava Martinez',
    userId: 'test-user-1',
    userRole: 'admin'
  },

  // Test 10: Ambiguous query
  {
    query: 'grades',
    userId: 'test-user-1',
    userRole: 'student'
  }
]

interface TestResult {
  testCase: number
  query: string
  success: boolean
  intent: string
  action: string | null
  handlerAction: string | null
  executionPath: string
  executionTime: number
  responseText: string
}

const results: TestResult[] = []

async function runTest(testCase: PipelineRequest, index: number) {
  console.log(`\n${'─'.repeat(70)}`)
  console.log(`TEST ${index + 1}: "${testCase.query}"`)
  console.log(`User: ${testCase.userId} (${testCase.userRole})`)
  console.log('')

  try {
    const response = await pipeline.process(testCase)

    const result: TestResult = {
      testCase: index + 1,
      query: testCase.query,
      success: response.success,
      intent: response.intent,
      action: response.action,
      handlerAction: response.handlerAction,
      executionPath: response.executionPath,
      executionTime: response.executionTime,
      responseText: response.text
    }

    results.push(result)

    const status = response.success ? '✅' : '❌'
    console.log(`${status} Result: ${response.success ? 'SUCCESS' : 'FAILED'}`)
    console.log(`   Intent: ${response.intent}`)
    console.log(`   Action: ${response.action || 'none'}`)
    console.log(`   Handler: ${response.handlerAction || 'none'}`)
    console.log(`   Path: ${response.executionPath}`)
    console.log(`   Time: ${response.executionTime}ms`)

    if (response.success) {
      console.log(`   Response: ${response.text?.substring(0, 100)}${response.text?.length > 100 ? '...' : ''}`)
    } else {
      console.log(`   Error: ${response.text}`)
    }

  } catch (error: any) {
    console.log(`❌ Exception: ${error.message}`)
    results.push({
      testCase: index + 1,
      query: testCase.query,
      success: false,
      intent: 'ERROR',
      action: null,
      handlerAction: null,
      executionPath: 'error',
      executionTime: 0,
      responseText: error.message
    })
  }
}

// Run all tests
async function runAllTests() {
  for (let i = 0; i < testCases.length; i++) {
    await runTest(testCases[i], i)
  }

  // Summary
  console.log('\n' + '═'.repeat(70))
  console.log('TEST SUMMARY')
  console.log('═'.repeat(70))

  const passed = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length

  console.log(`Total Tests: ${results.length}`)
  console.log(`Passed: ${passed} ✅`)
  console.log(`Failed: ${failed} ${failed > 0 ? '❌' : ''}`)
  console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`)

  // Execution path breakdown
  console.log('\nEXECUTION PATH BREAKDOWN:')
  const pathCounts = results.reduce((acc, r) => {
    acc[r.executionPath] = (acc[r.executionPath] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  Object.entries(pathCounts).forEach(([path, count]) => {
    console.log(`  ${path}: ${count}`)
  })

  // Intent breakdown
  console.log('\nINTENT BREAKDOWN:')
  const intentCounts = results.reduce((acc, r) => {
    acc[r.intent] = (acc[r.intent] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  Object.entries(intentCounts).forEach(([intent, count]) => {
    console.log(`  ${intent}: ${count}`)
  })

  // Average execution time
  const avgTime = results.reduce((sum, r) => sum + r.executionTime, 0) / results.length
  console.log(`\nAverage Execution Time: ${avgTime.toFixed(0)}ms`)

  // Failed tests
  if (failed > 0) {
    console.log('\nFAILED TESTS:')
    results.filter(r => !r.success).forEach(r => {
      console.log(`  ❌ Test ${r.testCase}: ${r.query}`)
      console.log(`     ${r.responseText}`)
    })
  }

  console.log('═'.repeat(70))

  if (failed === 0) {
    console.log('\n✅ All tests passed!')
    process.exit(0)
  } else {
    console.log(`\n⚠️  ${failed} test(s) failed`)
    process.exit(1)
  }
}

runAllTests().catch(console.error)
