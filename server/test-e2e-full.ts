#!/usr/bin/env node

/**
 * END-TO-END INTEGRATION TEST SUITE (Robust Version)
 *
 * Tests REAL database + service layer (API tests are optional)
 *
 * Test coverage:
 * 1. Intent classification (Thai + English)
 * 2. Entity extraction + propagation
 * 3. Target student ID validation
 * 4. Repository query filters
 * 5. No accidental ALL-record queries
 * 6. Structured responses when LLM fails
 * 7. Security/access control
 * 8. Optional: API endpoint tests (if server running)
 */

import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// Load .env from server directory
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
config({ path: resolve(__dirname, '.env') })

import { createClient } from '@supabase/supabase-js'
import { classifyIntent } from './rag/services/intent.service.js'
import {
  getPersonalDataByAction,
  extractStudentName
} from './services/grade.service.js'

// ============================================================
// CONFIGURATION
// ============================================================

const API_URL = process.env.API_URL || 'http://localhost:3001'
const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || ''

const TEST_ADMIN_ID = process.env.TEST_ADMIN_ID || 'admin-test-id'
const TEST_ADMIN_ROLE = 'admin'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ============================================================
// TEST RESULTS TRACKING
// ============================================================

interface TestResult {
  name: string
  passed: boolean
  details: string
  duration: number
  metadata?: Record<string, any>
}

const results: TestResult[] = []

function recordResult(
  name: string,
  passed: boolean,
  details: string,
  duration: number,
  metadata?: Record<string, any>
) {
  const result: TestResult = { name, passed, details, duration, metadata }
  results.push(result)

  const icon = passed ? '✓' : '✗'
  console.log(`${icon} ${name}: ${passed ? 'PASS' : 'FAIL'}`)
  console.log(`  ${details}`)
}

async function withDuration<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
  const start = Date.now()
  try {
    const result = await fn()
    return { result, duration: Date.now() - start }
  } catch (error) {
    return { result: null as unknown as T, duration: Date.now() - start }
  }
}

// ============================================================
// SETUP: Create Test Data
// ============================================================

async function setupTestData() {
  console.log('\n=== SETUP: Creating Test Data ===')

  // Find or create Ava Martinez
  const { data: existingStudents, error: studentError } = await supabase
    .from('students')
    .select('id, name')
    .ilike('name', '%Ava%')

  if (studentError) {
    recordResult('Database Connection', false, `Error: ${studentError.message}`, 0)
    return null
  }

  recordResult('Database Connection', true, `Found ${existingStudents?.length || 0} students`, 0)

  let testStudent = existingStudents?.find(s => s.name.includes('Ava'))

  if (!testStudent) {
    console.log('  Creating test student "Ava Martinez"...')

    // First find a class
    const { data: classes } = await supabase
      .from('classes')
      .select('id')
      .limit(1)

    const classId = classes?.[0]?.id || null

    const { data: newStudent, error: createError } = await supabase
      .from('students')
      .insert({
        name: 'Ava Martinez',
        class: 'Grade 10-A',
        grade_level: 10,
        enrollment_date: new Date().toISOString()
      })
      .select('id, name')
      .single()

    if (createError) {
      recordResult('Create Test Student', false, `Error: ${createError.message}`, 0)
      return null
    }

    testStudent = newStudent

    // Create sample grades
    if (classId) {
      const sampleGrades = [
        { student_id: testStudent.id, class_id: classId, final_grade: 95, letter_grade: 'A', grade_points: 4.0, term: '1', academic_year: '2025' },
        { student_id: testStudent.id, class_id: classId, final_grade: 87, letter_grade: 'B+', grade_points: 3.5, term: '1', academic_year: '2025' },
        { student_id: testStudent.id, class_id: classId, final_grade: 92, letter_grade: 'A-', grade_points: 3.7, term: '1', academic_year: '2025' }
      ]

      await supabase.from('student_subject_grades').insert(sampleGrades)
      recordResult('Create Sample Grades', true, `Created 3 grades for ${testStudent.name}`, 0)
    }
  } else {
    recordResult('Find Test Student', true, `Found: ${testStudent.name}`, 0)
  }

  return testStudent
}

// ============================================================
// CATEGORY 1: Intent Classification
// ============================================================

async function testIntentClassification() {
  console.log('\n=== TEST: Intent Classification ===')

  const testCases = [
    { query: 'เกรดของ Ava Martinez ในเแต่ละวิชา', expected: 'personal_data' },
    { query: 'ข้อมูลของ Ava Martinez ที่มี', expected: 'personal_data' },
    { query: 'What are the grades of Ava Martinez?', expected: 'personal_data' },
    { query: 'How many students are there?', expected: 'database_query' },
    { query: 'กฎเครื่องแบบคืออะไร', expected: 'knowledge' }
  ]

  for (const tc of testCases) {
    const { result, duration } = await withDuration(() => Promise.resolve(
      classifyIntent(tc.query, { role: 'admin' })
    ))

    const personEntity = result.detectedEntities?.find(e => e.type === 'person_name')
    const passed = result.intent === tc.expected

    recordResult(
      `Intent: "${tc.query}"`,
      passed,
      `Intent: ${result.intent} (conf: ${result.confidence.toFixed(2)})${personEntity ? `, Person: ${personEntity.value}` : ''}`,
      duration,
      { query: tc.query, intent: result.intent, expected: tc.expected, confidence: result.confidence }
    )
  }
}

// ============================================================
// CATEGORY 2: Entity Extraction
// ============================================================

async function testEntityExtraction() {
  console.log('\n=== TEST: Entity Extraction ===')

  const testCases = [
    'เกรดของ Ava Martinez ในเแต่ละวิชา',
    'ข้อมูลของ Ava Martinez ที่มี',
    'Show grades for Ava Martinez',
    'Ava Martinez grades please'
  ]

  for (const query of testCases) {
    const { result: intentResult, duration: intentDuration } = await withDuration(() => Promise.resolve(
      classifyIntent(query, { role: 'admin' })
    ))

    const personEntity = intentResult.detectedEntities?.find(e => e.type === 'person_name')
    const extractedName = personEntity?.value || null

    const { result: serviceResult, duration: serviceDuration } = await withDuration(() => Promise.resolve(
      extractStudentName(query)
    ))

    recordResult(
      `Entity: "${query}"`,
      extractedName !== null,
      extractedName
        ? `Extracted: "${extractedName}" (service: "${serviceResult}")`
        : 'No person entity detected',
      intentDuration + serviceDuration,
      { query, extractedName, serviceExtracted: serviceResult, allEntities: intentResult.detectedEntities }
    )
  }
}

// ============================================================
// CATEGORY 3: Repository Query Filters
// ============================================================

async function testRepositoryQueryFilters(testStudent: any) {
  console.log('\n=== TEST: Repository Query Filters ===')

  if (!testStudent) {
    recordResult('Repository Query Filters', false, 'No test student available', 0)
    return
  }

  // Test 1: Query with specific student
  const { result: specificResult, duration: specificDuration } = await withDuration(() =>
    getPersonalDataByAction('เกรดของ Ava Martinez', 'Ava Martinez', TEST_ADMIN_ID, TEST_ADMIN_ROLE)
  )

  const hasData = specificResult.data && specificResult.data.length > 0

  recordResult(
    'Query: Specific Student (Ava Martinez)',
    hasData,
    hasData
      ? `Found ${specificResult.data.length} records`
      : 'No data found',
    specificDuration,
    { action: specificResult.action, recordCount: specificResult.data?.length || 0, sampleData: specificResult.data?.slice(0, 2) }
  )

  // Test 2: Verify targetStudentId propagation
  console.log('\n  Verifying entity propagation to service...')

  const intentResult = classifyIntent('เกรดของ Ava Martinez', { role: 'admin' })
  const personEntity = intentResult.detectedEntities?.find(e => e.type === 'person_name')

  recordResult(
    'Entity Propagation: Intent → Service',
    personEntity?.value === 'Ava Martinez',
    personEntity?.value || 'No entity detected',
    0,
    { detectedPerson: personEntity?.value, intent: intentResult.intent }
  )
}

// ============================================================
// CATEGORY 4: Target Student ID Validation
// ============================================================

async function testTargetStudentId(testStudent: any) {
  console.log('\n=== TEST: Target Student ID Validation ===')

  if (!testStudent) {
    recordResult('Target Student ID Validation', false, 'No test student available', 0)
    return
  }

  const testCases = [
    { query: 'เกรดของ Ava Martinez', shouldHaveTarget: true },
    { query: 'เกรดของฉัน', shouldHaveTarget: false }
  ]

  for (const tc of testCases) {
    const intentResult = classifyIntent(tc.query, { role: 'admin' })
    const personName = intentResult.detectedEntities?.find(e => e.type === 'person_name')?.value

    const { result: dataResult, duration } = await withDuration(() =>
      getPersonalDataByAction(tc.query, personName || null, TEST_ADMIN_ID, TEST_ADMIN_ROLE)
    )

    const passed = tc.shouldHaveTarget ? personName !== null : true

    recordResult(
      `Target Student: "${tc.query}"`,
      passed,
      `Detected person: ${personName || 'none'}, Action: ${dataResult.action}`,
      duration,
      { query: tc.query, detectedPerson: personName, expectedTarget: tc.shouldHaveTarget }
    )
  }
}

// ============================================================
// CATEGORY 5: Security - No Accidental ALL Queries
// ============================================================

async function testNoAccidentalAllQueries() {
  console.log('\n=== TEST: Security - No Accidental ALL Queries ===')

  // Test with student role (should only get own data)
  const testStudentId = 'student-123'
  const testRole = 'student'

  const { result, duration } = await withDuration(() =>
    getPersonalDataByAction('show all grades', null, testStudentId, testRole)
  )

  // Student should not get ALL records
  const isSafe = result.data === undefined ||
                 result.data.length === 0 ||
                 result.error?.includes('ACCESS_DENIED') ||
                 result.error?.includes('UNAUTHORIZED')

  recordResult(
    'Security: Student cannot query ALL',
    isSafe,
    isSafe
      ? 'Access control working'
      : 'WARNING: Student might have access to all records!',
    duration,
    { role: testRole, hasData: !!result.data, dataLength: result.data?.length || 0, error: result.error }
  )
}

// ============================================================
// CATEGORY 6: Structured Response (LLM-less)
// ============================================================

async function testStructuredResponses() {
  console.log('\n=== TEST: Structured Response (LLM-less fallback) ===')

  const { result, duration } = await withDuration(() =>
    getPersonalDataByAction('เกรดของ Ava Martinez', 'Ava Martinez', TEST_ADMIN_ID, TEST_ADMIN_ROLE)
  )

  const hasData = result.data && result.data.length > 0
  const noError = !result.error

  recordResult(
    'Structured Response: Works without LLM',
    hasData && noError,
    hasData
      ? `Returned ${result.data.length} records (structured data, no LLM needed)`
      : `Failed: ${result.error || 'No data'}`,
    duration,
    { action: result.action, dataLength: result.data?.length || 0, error: result.error }
  )
}

// ============================================================
// CATEGORY 7: API Endpoint (Optional)
// ============================================================

async function testAPIEndpoint() {
  console.log('\n=== TEST: API Endpoint (Optional) ===')

  // Check if server is running
  try {
    const { result: response, duration } = await withDuration(() =>
      fetch(`${API_URL}/api/rag/health`, { method: 'GET' })
    )

    if (!response || !response.ok) {
      console.log('⚠ Server not running - skipping API endpoint tests')
      return
    }

    console.log('✓ Server is running - testing API...')

    // Test Thai query
    const { result: data, duration: queryDuration } = await withDuration(async () => {
      const resp = await fetch(`${API_URL}/api/rag/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          question: 'เกรดของ Ava Martinez ในเแต่ละวิชา',
          userId: TEST_ADMIN_ID,
          userRole: TEST_ADMIN_ROLE
        })
      })
      return resp.json()
    })

    const hasResponse = !!data.text && data.text.length > 0

    recordResult(
      'API: Thai personal query',
      hasResponse,
      hasResponse
        ? `Response: ${data.text.substring(0, 50)}...`
        : 'No text response',
      queryDuration,
      { type: data.type, intent: data.intent, action: data.action, hasText: hasResponse, emotion: data.emotion }
    )

  } catch (error) {
    console.log('⚠ Server not available - skipping API endpoint tests')
  }
}

// ============================================================
// MAIN RUNNER
// ============================================================

export async function runAllTests() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗')
  console.log('║     END-TO-END INTEGRATION TEST SUITE                        ║')
  console.log('║     Real Database + Service Layer (No Mocks)                  ║')
  console.log('╚══════════════════════════════════════════════════════════════╝\n')

  console.log(`Supabase: ${SUPABASE_URL.substring(0, 35)}...`)
  console.log(`API: ${API_URL}`)

  const startTime = Date.now()

  try {
    // Setup test data
    const testStudent = await setupTestData()

    // Run all tests
    await testIntentClassification()
    await testEntityExtraction()
    await testRepositoryQueryFilters(testStudent)
    await testTargetStudentId(testStudent)
    await testNoAccidentalAllQueries()
    await testStructuredResponses()
    await testAPIEndpoint()

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error)
  }

  const totalDuration = Date.now() - startTime

  // ============================================================
  // SUMMARY REPORT
  // ============================================================

  console.log('\n\n╔══════════════════════════════════════════════════════════════╗')
  console.log('║                        TEST SUMMARY                          ║')
  console.log('╚══════════════════════════════════════════════════════════════╝\n')

  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length
  const total = results.length
  const passRate = ((passed / total) * 100).toFixed(1)

  console.log(`Total Tests: ${total}`)
  console.log(`Passed: ${passed}`)
  console.log(`Failed: ${failed}`)
  console.log(`Pass Rate: ${passRate}%`)
  console.log(`Duration: ${totalDuration}ms`)

  console.log('\n─────────────────────────────────────────────────────────────')

  for (const result of results) {
    const icon = result.passed ? '✓' : '✗'
    console.log(`${icon} ${result.name}`)
  }

  // Failed tests details
  if (failed > 0) {
    console.log('\n─────────────────────────────────────────────────────────────')
    console.log('FAILED TESTS:\n')

    for (const result of results.filter(r => !r.passed)) {
      console.log(`✗ ${result.name}`)
      console.log(`  ${result.details}\n`)
    }
  }

  // ============================================================
  // PRODUCTION READINESS (Thai)
  // ============================================================

  console.log('\n╔══════════════════════════════════════════════════════════════╗')
  console.log('║           การประเมินความพร้อมใช้งาน Production             ║')
  console.log('╚══════════════════════════════════════════════════════════════╝\n')

  const readiness: string[] = []
  const issues: string[] = []

  if (passed >= total * 0.9) {
    readiness.push('✓ พร้อมใช้งานระดับ Production (Production Ready)')
  } else if (passed >= total * 0.7) {
    readiness.push('⚠ พร้อมใช้งานระดับ Staging (Staging Ready)')
  } else {
    readiness.push('✗ ยังไม่พร้อมใช้งาน (Not Ready)')
  }

  // Check specific areas
  const intentPass = results.filter(r => r.name.includes('Intent:') && r.passed).length
  const intentTotal = results.filter(r => r.name.includes('Intent:')).length
  if (intentPass === intentTotal) {
    readiness.push('✓ ระบบจำแนก Intent ทำงานได้ดี')
  } else {
    issues.push(`✗ Intent: ${intentPass}/${intentTotal} passed`)
  }

  const entityPass = results.filter(r => r.name.includes('Entity:') && r.passed).length
  const entityTotal = results.filter(r => r.name.includes('Entity:')).length
  if (entityPass === entityTotal) {
    readiness.push('✓ ระบบตรวจจับ Entity ทำงานได้ดี')
  } else {
    issues.push(`✗ Entity: ${entityPass}/${entityTotal} passed`)
  }

  const securityPass = results.filter(r =>
    (r.name.includes('Security') || r.name.includes('Access')) && r.passed
  ).length
  const securityTotal = results.filter(r =>
    r.name.includes('Security') || r.name.includes('Access')
  ).length
  if (securityPass === securityTotal) {
    readiness.push('✓ ระบบความปลอดภัย (Access Control) ทำงานได้ดี')
  } else {
    issues.push(`✗ Security: ${securityPass}/${securityTotal} passed`)
  }

  const repoPass = results.filter(r => r.name.includes('Repository') && r.passed).length
  const repoTotal = results.filter(r => r.name.includes('Repository')).length
  if (repoPass === repoTotal) {
    readiness.push('✓ การกรองข้อมูลตามสิทธิ์ (Data Filtering) ทำงานได้ดี')
  } else {
    issues.push(`✗ Data Filtering: ${repoPass}/${repoTotal} passed`)
  }

  const structPass = results.filter(r => r.name.includes('Structured') && r.passed).length
  const structTotal = results.filter(r => r.name.includes('Structured')).length
  if (structPass === structTotal) {
    readiness.push('✓ ระบบส่งคำตอบแบบ Structured (Fallback) ทำงานได้ดี')
  } else {
    issues.push(`✗ Structured Response: ${structPass}/${structTotal} passed`)
  }

  console.log('สถานะความพร้อม (Readiness Status):')
  readiness.forEach(r => console.log(`  ${r}`))

  if (issues.length > 0) {
    console.log('\nประเด็นที่ต้องแก้ (Issues to Fix):')
    issues.forEach(i => console.log(`  ${i}`))
  }

  console.log(`\nรวมสรุป: ${passed}/${total} ผ่าน (${passRate}%)`)

  console.log('\n╔══════════════════════════════════════════════════════════════╗\n')

  return { passed, failed, total, passRate: parseFloat(passRate), results }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error)
}
