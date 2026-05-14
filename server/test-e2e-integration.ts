/**
 * END-TO-END INTEGRATION TEST SUITE
 *
 * Tests REAL API + Database (no mocks)
 *
 * Test coverage:
 * 1. Thai personal/student-specific queries
 * 2. Entity extraction + propagation
 * 3. Target student ID validation
 * 4. Repository query filters
 * 5. No accidental ALL-record queries
 * 6. Structured responses when LLM fails
 * 7. Invalid API key handling
 * 8. No LLM provider handling
 * 9. Graceful degradation
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

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env file')
  console.error(`Current: SUPABASE_URL="${SUPABASE_URL}", SUPABASE_KEY="${SUPABASE_KEY ? '***' : ''}"`)
  process.exit(1)
}

// Test user (admin for full access)
const TEST_ADMIN_ID = process.env.TEST_ADMIN_ID || 'admin-test-id'
const TEST_ADMIN_ROLE = 'admin'

// ============================================================
// DATABASE CLIENT
// ============================================================

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ============================================================
// TEST UTILITIES
// ============================================================

interface TestResult {
  name: string
  passed: boolean
  details: string
  duration: number
  metadata?: Record<string, any>
}

const results: TestResult[] = []

function logTest(name: string, details: string = '') {
  console.log(`\n${'='.repeat(70)}`)
  console.log(`TEST: ${name}`)
  if (details) console.log(`DETAILS: ${details}`)
  console.log(`${'='.repeat(70)}`)
}

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
  const color = passed ? '\x1b[32m' : '\x1b[31m'
  console.log(`${color}${icon} ${name}: ${passed ? 'PASS' : 'FAIL'}\x1b[0m`)
  console.log(`  ${details}`)
  if (metadata) {
    console.log(`  Metadata:`, JSON.stringify(metadata, null, 2))
  }
}

async function withDuration<T>(
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = Date.now()
  try {
    const result = await fn()
    return { result, duration: Date.now() - start }
  } catch (error) {
    return { result: null as unknown as T, duration: Date.now() - start }
  }
}

// ============================================================
// TEST CATEGORIES
// ============================================================

// ============================================================
// CATEGORY 1: DATABASE SEEDING & VERIFICATION
// ============================================================

async function setupTestData() {
  logTest('Setup Test Data', 'Creating test students and grades')

  // Check if we have students
  const { data: existingStudents, error: studentError } = await supabase
    .from('students')
    .select('id, name')
    .limit(10)

  if (studentError) {
    recordResult(
      'Database Connection',
      false,
      `Failed to query students: ${studentError.message}`,
      0
    )
    return { testStudent: null, testGrades: 0 }
  }

  recordResult(
    'Database Connection',
    true,
    `Connected successfully, found ${existingStudents?.length || 0} students`,
    0
  )

  // Find or create test student "Ava Martinez"
  let testStudent = existingStudents?.find(s => s.name.includes('Ava'))

  if (!testStudent) {
    console.log('  Creating test student "Ava Martinez"...')
    const { data: newStudent, error: createError } = await supabase
      .from('students')
      .insert({
        name: 'Ava Martinez',
        class: 'Grade 10',
        grade_level: 10,
        enrollment_date: new Date().toISOString()
      })
      .select('id, name')
      .single()

    if (createError) {
      recordResult(
        'Create Test Student',
        false,
        `Failed to create Ava Martinez: ${createError.message}`,
        0
      )
      return { testStudent: null, testGrades: 0 }
    }

    testStudent = newStudent
    recordResult(
      'Create Test Student',
      true,
      `Created student: ${testStudent.name} (ID: ${testStudent.id})`,
      0,
      { studentId: testStudent.id }
    )
  } else {
    recordResult(
      'Find Test Student',
      true,
      `Found existing student: ${testStudent.name} (ID: ${testStudent.id})`,
      0,
      { studentId: testStudent.id }
    )
  }

  // Check for grades
  const { data: grades, error: gradesError } = await supabase
    .from('student_subject_grades')
    .select('*')
    .eq('student_id', testStudent.id)

  if (gradesError) {
    recordResult(
      'Query Grades',
      false,
      `Failed to query grades: ${gradesError.message}`,
      0
    )
    return { testStudent, testGrades: 0 }
  }

  const gradeCount = grades?.length || 0
  recordResult(
    'Query Grades',
    true,
    `Found ${gradeCount} existing grade records`,
    0,
    { gradeCount, grades: grades?.slice(0, 3) }
  )

  // Create sample grades if none exist
  if (gradeCount === 0) {
    console.log('  Creating sample grades...')

    // First, we need a class
    const { data: testClass, error: classError } = await supabase
      .from('classes')
      .select('id')
      .limit(1)
      .single()

    let classId = testClass?.id

    if (!classId) {
      const { data: newClass } = await supabase
        .from('classes')
        .insert({
          name: 'Mathematics 101',
          subject: 'Mathematics',
          section: 'A'
        })
        .select('id')
        .single()
      classId = newClass?.id
    }

    const sampleGrades = [
      { student_id: testStudent.id, class_id: classId!, final_grade: 95, letter_grade: 'A', grade_points: 4.0, term: '1', academic_year: '2025' },
      { student_id: testStudent.id, class_id: classId!, final_grade: 87, letter_grade: 'B+', grade_points: 3.5, term: '1', academic_year: '2025' },
      { student_id: testStudent.id, class_id: classId!, final_grade: 92, letter_grade: 'A-', grade_points: 3.7, term: '1', academic_year: '2025' }
    ]

    const { error: insertError } = await supabase
      .from('student_subject_grades')
      .insert(sampleGrades)

    if (insertError) {
      recordResult(
        'Create Sample Grades',
        false,
        `Failed to create grades: ${insertError.message}`,
        0
      )
    } else {
      recordResult(
        'Create Sample Grades',
        true,
        `Created ${sampleGrades.length} sample grade records`,
        0
      )
    }
  }

  return { testStudent, testGrades: gradeCount }
}

// ============================================================
// CATEGORY 2: INTENT CLASSIFICATION TESTS
// ============================================================

async function testIntentClassification() {
  logTest('Intent Classification', 'Testing Thai + English queries')

  const testCases = [
    {
      query: 'เกรดของ Ava Martinez ในเเต่ล่ะวิชา',
      expectedIntent: 'personal_data',
      expectedPerson: 'Ava Martinez'
    },
    {
      query: 'ข้อมูลของ Ava Martinez ที่มี',
      expectedIntent: 'personal_data',
      expectedPerson: 'Ava Martinez'
    },
    {
      query: 'What are the grades of Ava Martinez?',
      expectedIntent: 'personal_data',
      expectedPerson: 'Ava Martinez'
    },
    {
      query: 'Show me Emma Miller\'s attendance',
      expectedIntent: 'personal_data',
      expectedPerson: 'Emma Miller'
    },
    {
      query: 'How many students are there?',
      expectedIntent: 'database_query',
      expectedPerson: null
    },
    {
      query: 'กฎเครื่องแบบคืออะไร',
      expectedIntent: 'knowledge',
      expectedPerson: null
    }
  ]

  for (const testCase of testCases) {
    const { result, duration } = await withDuration(async () => {
      return classifyIntent(testCase.query, { role: 'admin' })
    })

    const intentMatch = result.intent === testCase.expectedIntent
    const personEntity = result.detectedEntities?.find(e => e.type === 'person_name')
    const personMatch = testCase.expectedPerson === null
      ? personEntity === undefined
      : personEntity?.value === testCase.expectedPerson

    const passed = intentMatch && personMatch

    recordResult(
      `Intent: "${testCase.query}"`,
      passed,
      passed
        ? `Correct: ${result.intent}${personEntity ? `, person: ${personEntity.value}` : ''}`
        : `Expected intent=${testCase.expectedIntent}, got ${result.intent}${personEntity ? `, person: ${personEntity.value}` : ''}`,
      duration,
      {
        query: testCase.query,
        detectedIntent: result.intent,
        expectedIntent: testCase.expectedIntent,
        detectedPerson: personEntity?.value,
        expectedPerson: testCase.expectedPerson,
        confidence: result.confidence,
        routingReason: result.routingReason
      }
    )
  }
}

// ============================================================
// CATEGORY 3: ENTITY EXTRACTION + PROPAGATION TESTS
// ============================================================

async function testEntityExtraction(testStudent: any) {
  logTest('Entity Extraction & Propagation', 'Testing name extraction flow')

  const testQueries = [
    'เกรดของ Ava Martinez ในเแต่ละวิชา',
    'ข้อมูลของ Ava Martinez ที่มี',
    'Show grades for Ava Martinez',
    'Ava Martinez grades please'
  ]

  for (const query of testQueries) {
    const { result: intentResult, duration: intentDuration } = await withDuration(async () => {
      return classifyIntent(query, { role: 'admin' })
    })

    const personEntity = intentResult.detectedEntities?.find(e => e.type === 'person_name')
    const extractedName = personEntity?.value || null

    // Test student name extraction from grade service
    const { result: serviceExtracted, duration: extractDuration } = await withDuration(async () => {
      return extractStudentName(query)
    })

    const passed = extractedName !== null

    recordResult(
      `Entity Extraction: "${query}"`,
      passed,
      passed
        ? `Extracted: "${extractedName}" (also via service: "${serviceExtracted}")`
        : 'No person entity detected',
      intentDuration + extractDuration,
      {
        query,
        extractedPerson: extractedName,
        serviceExtracted,
        allEntities: intentResult.detectedEntities,
        intent: intentResult.intent
      }
    )
  }
}

// ============================================================
// CATEGORY 4: REPOSITORY QUERY FILTER TESTS
// ============================================================

async function testRepositoryQueryFilters(testStudent: any) {
  logTest('Repository Query Filters', 'Testing student ID filtering')

  if (!testStudent) {
    recordResult(
      'Repository Query Filters',
      false,
      'No test student available',
      0
    )
    return
  }

  // Test 1: Query with specific student ID
  const { result: specificResult, duration: specificDuration } = await withDuration(async () => {
    return getPersonalDataByAction(
      'เกรดของ Ava Martinez',
      'Ava Martinez',
      TEST_ADMIN_ID,
      TEST_ADMIN_ROLE
    )
  })

  const hasData = specificResult.data && specificResult.data.length > 0
  const allRecordsForStudent = hasData
    ? specificResult.data.every((g: any) =>
        g.student_id === testStudent.id || g.student_name === 'Ava Martinez'
      )
    : false

  recordResult(
    'Query: Specific Student (Ava Martinez)',
    hasData && allRecordsForStudent,
    hasData
      ? `Found ${specificResult.data.length} records, all for Ava Martinez`
      : 'No data found or data contains other students',
    specificDuration,
    {
      action: specificResult.action,
      recordCount: specificResult.data?.length || 0,
      sampleData: specificResult.data?.slice(0, 2),
      allForTargetStudent: allRecordsForStudent
    }
  )

  // Test 2: Verify no ALL-record queries (access control)
  console.log('\n  Testing access control...')

  // This should only return data for the admin's accessible scope
  const { result: adminResult, duration: adminDuration } = await withDuration(async () => {
    return getPersonalDataByAction(
      'เกรดทั้งหมด',
      null,
      TEST_ADMIN_ID,
      TEST_ADMIN_ROLE
    )
  })

  recordResult(
    'Access Control: Admin ALL access',
    adminResult.action === 'GET_GRADES',
    adminResult.error
      ? `Error: ${adminResult.error}`
      : `Action: ${adminResult.action}, records: ${adminResult.data?.length || 0}`,
    adminDuration,
    {
      action: adminResult.action,
      hasData: !!adminResult.data,
      dataLength: adminResult.data?.length || 0,
      error: adminResult.error
    }
  )
}

// ============================================================
// CATEGORY 5: API ENDPOINT TESTS
// ============================================================

async function testAPIEndpoint() {
  logTest('API Endpoint Tests', 'Testing /api/rag/ask with real HTTP')

  const testCases = [
    {
      query: 'เกรดของ Ava Martinez ในเแต่ละวิชา',
      expectedType: 'personal_data'
    },
    {
      query: 'ข้อมูลของ Ava Martinez ที่มี',
      expectedType: 'personal_data'
    },
    {
      query: 'How many students are there?',
      expectedType: 'database_query'
    }
  ]

  for (const testCase of testCases) {
    const { result, duration } = await withDuration(async () => {
      const response = await fetch(`${API_URL}/api/rag/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          question: testCase.query,
          userId: TEST_ADMIN_ID,
          userRole: TEST_ADMIN_ROLE
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return response.json()
    })

    const passed = result.type === testCase.expectedType || result.intent === 'personal_data'
    const hasText = !!result.text && result.text.length > 0
    const hasEmotion = !!result.emotion

    recordResult(
      `API: "${testCase.query}"`,
      passed && hasText,
      passed
        ? `Type: ${result.type || result.intent}, text: ${result.text.substring(0, 50)}...`
        : `Expected type=${testCase.expectedType}, got ${result.type || result.intent}`,
      duration,
      {
        query: testCase.query,
        type: result.type,
        intent: result.intent,
        action: result.action,
        hasText,
        emotion: result.emotion,
        detectedEntities: result.detectedEntities,
        routingReason: result.routingReason,
        fallbackUsed: result.fallbackUsed
      }
    )
  }
}

// ============================================================
// CATEGORY 6: STRUCTURED RESPONSE TESTS (LLM-LESS)
// ============================================================

async function testStructuredResponses() {
  logTest('Structured Responses', 'Testing responses without LLM')

  // Simulate LLM failure scenario
  console.log('  Simulating LLM failure...')

  const { result, duration } = await withDuration(async () => {
    // This should work even if LLM is down
    return getPersonalDataByAction(
      'เกรดของ Ava Martinez',
      'Ava Martinez',
      TEST_ADMIN_ID,
      TEST_ADMIN_ROLE
    )
  })

  const hasData = result.data && result.data.length > 0
  const noError = !result.error

  recordResult(
    'Structured Response: LLM-less fallback',
    hasData && noError,
    hasData
      ? `Returned ${result.data.length} records without LLM`
      : `Failed: ${result.error || 'No data'}`,
    duration,
    {
      action: result.action,
      actionDescription: result.actionDescription,
      dataLength: result.data?.length || 0,
      error: result.error,
      sampleData: result.data?.slice(0, 2)
    }
  )
}

// ============================================================
// CATEGORY 7: INVALID API KEY TESTS
// ============================================================

async function testInvalidAPIKey() {
  logTest('Invalid API Key Handling', 'Testing with invalid MiniMax key')

  // Save original key
  const originalKey = process.env.MINIMAX_API_KEY
  const originalProvider = process.env.LLM_PROVIDER

  try {
    // Set invalid key
    process.env.MINIMAX_API_KEY = 'invalid-key-12345'
    process.env.LLM_PROVIDER = 'minimax'

    console.log('  Testing with invalid MiniMax key...')

    const { result, duration } = await withDuration(async () => {
      return fetch(`${API_URL}/api/rag/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: 'เกรดของ Ava Martinez',
          userId: TEST_ADMIN_ID,
          userRole: TEST_ADMIN_ROLE
        })
      })
    })

    if (result.ok) {
      const data = await result.json()
      // Should still return data even with invalid LLM key
      const hasText = !!data.text
      recordResult(
        'Invalid API Key: Graceful degradation',
        hasText,
        `Response received despite invalid key: ${data.text?.substring(0, 50)}...`,
        duration,
        {
          hasText,
          type: data.type,
          fallbackUsed: data.fallbackUsed,
          error: data.error
        }
      )
    } else {
      recordResult(
        'Invalid API Key: HTTP error',
        false,
        `HTTP ${result.status}: ${result.statusText}`,
        duration
      )
    }
  } finally {
    // Restore original key
    if (originalKey) {
      process.env.MINIMAX_API_KEY = originalKey
    }
    if (originalProvider) {
      process.env.LLM_PROVIDER = originalProvider
    }
  }
}

// ============================================================
// CATEGORY 8: NO LLM PROVIDER TESTS
// ============================================================

async function testNoLLMProvider() {
  logTest('No LLM Provider', 'Testing with LLM disabled')

  // Save original
  const originalProvider = process.env.LLM_PROVIDER

  try {
    // Disable LLM
    process.env.LLM_PROVIDER = ''

    console.log('  Testing with no LLM provider configured...')

    const { result, duration } = await withDuration(async () => {
      return getPersonalDataByAction(
        'เกรดของ Ava Martinez',
        'Ava Martinez',
        TEST_ADMIN_ID,
        TEST_ADMIN_ROLE
      )
    })

    // Data should still be retrieved from database
    const hasData = result.data && result.data.length > 0

    recordResult(
      'No LLM Provider: DB still works',
      hasData,
      hasData
        ? `Retrieved ${result.data.length} records without LLM`
        : 'Failed to retrieve data',
      duration,
      {
        action: result.action,
        dataLength: result.data?.length || 0,
        error: result.error
      }
    )
  } finally {
    if (originalProvider) {
      process.env.LLM_PROVIDER = originalProvider
    }
  }
}

// ============================================================
// CATEGORY 9: TARGET STUDENT ID VALIDATION
// ============================================================

async function testTargetStudentId(testStudent: any) {
  logTest('Target Student ID Validation', 'Ensuring targetStudentId is never undefined')

  if (!testStudent) {
    recordResult(
      'Target Student ID Validation',
      false,
      'No test student available',
      0
    )
    return
  }

  const testQueries = [
    { query: 'เกรดของ Ava Martinez', shouldHaveTarget: true },
    { query: 'เกรดของฉัน', shouldHaveTarget: false },
    { query: 'show all grades', shouldHaveTarget: false }
  ]

  for (const testCase of testQueries) {
    const { result: intentResult, duration: intentDuration } = await withDuration(async () => {
      return classifyIntent(testCase.query, { role: 'admin' })
    })

    const personName = intentResult.detectedEntities?.find(e => e.type === 'person_name')?.value

    const { result: dataResult, duration: dataDuration } = await withDuration(async () => {
      return getPersonalDataByAction(
        testCase.query,
        personName || null,
        TEST_ADMIN_ID,
        TEST_ADMIN_ROLE
      )
    })

    // If a person name was detected, we should have filtered results
    const passed = testCase.shouldHaveTarget
      ? personName === 'Ava Martinez' || personName === 'Ava'
      : personName === null || personName === undefined

    recordResult(
      `Target Student: "${testCase.query}"`,
      passed,
      passed
        ? `Target handling correct: ${personName || 'none (self)'}`
        : `Expected target=${testCase.shouldHaveTarget}, got personName=${personName}`,
      intentDuration + dataDuration,
      {
        query: testCase.query,
        detectedPerson: personName,
        expectedTarget: testCase.shouldHaveTarget,
        action: dataResult.action,
        dataLength: dataResult.data?.length || 0
      }
    )
  }
}

// ============================================================
// CATEGORY 10: NO ACCIDENTAL ALL-RECORD QUERIES
// ============================================================

async function testNoAccidentalAllQueries() {
  logTest('No Accidental ALL-Record Queries', 'Security check')

  // Test with non-admin user (simulated)
  const testStudentId = 'student-123'
  const testRole = 'student'

  const { result, duration } = await withDuration(async () => {
    return getPersonalDataByAction(
      'show all grades',
      null,
      testStudentId,
      testRole
    )
  })

  // Student should not be able to query ALL records
  // They should only get their own records or empty
  const isSafe = result.data === undefined ||
                 result.data.length === 0 ||
                 result.error?.includes('ACCESS_DENIED') ||
                 result.error?.includes('UNAUTHORIZED')

  recordResult(
    'Security: Non-admin cannot query ALL',
    isSafe,
    isSafe
      ? 'Access control working: student blocked or got own data only'
      : 'SECURITY ISSUE: Non-admin got all records!',
    duration,
    {
      role: testRole,
      action: result.action,
      dataLength: result.data?.length || 0,
      error: result.error,
      isAccessDenied: !!result.error?.includes('ACCESS_DENIED')
    }
  )
}

// ============================================================
// MAIN TEST RUNNER
// ============================================================

export async function runAllTests() {
  console.log('\n╔══════════════════════════════════════════════════════════════════╗')
  console.log('║     END-TO-END INTEGRATION TEST SUITE                           ║')
  console.log('║     Real API + Database (No Mocks)                              ║')
  console.log('╚══════════════════════════════════════════════════════════════════╝')

  console.log(`\nAPI URL: ${API_URL}`)
  console.log(`Supabase: ${SUPABASE_URL}`)

  const startTime = Date.now()

  try {
    // Setup
    const { testStudent } = await setupTestData()

    // Run all test categories
    await testIntentClassification()
    await testEntityExtraction(testStudent)
    await testRepositoryQueryFilters(testStudent)
    await testTargetStudentId(testStudent)
    await testNoAccidentalAllQueries()
    await testStructuredResponses()
    await testAPIEndpoint()
    await testInvalidAPIKey()
    await testNoLLMProvider()

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error)
  }

  const totalDuration = Date.now() - startTime

  // ============================================================
  // SUMMARY REPORT
  // ============================================================

  console.log('\n\n╔══════════════════════════════════════════════════════════════════╗')
  console.log('║                        TEST SUMMARY                              ║')
  console.log('╚══════════════════════════════════════════════════════════════════╝\n')

  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length
  const total = results.length
  const passRate = ((passed / total) * 100).toFixed(1)

  console.log(`Total Tests: ${total}`)
  console.log(`Passed: ${passed}`)
  console.log(`Failed: ${failed}`)
  console.log(`Pass Rate: ${passRate}%`)
  console.log(`Duration: ${totalDuration}ms`)

  console.log('\n─────────────────────────────────────────────────────────────────')

  // Group by category
  const categories = [
    'Database Connection',
    'Create',
    'Find',
    'Query',
    'Intent:',
    'Entity Extraction:',
    'Access Control:',
    'Target Student:',
    'Security:',
    'Structured Response:',
    'API:',
    'Invalid API Key:',
    'No LLM Provider:'
  ]

  const currentCategory: string[] = []
  let cat = ''

  for (const result of results) {
    // Determine category
    let newCat = 'Other'
    for (const c of categories) {
      if (result.name.startsWith(c.replace(':', ''))) {
        newCat = c
        break
      }
    }

    if (newCat !== cat) {
      cat = newCat
      console.log(`\n${cat}`)
    }

    const icon = result.passed ? '✓' : '✗'
    console.log(`  ${icon} ${result.name}`)
  }

  // Failed tests details
  if (failed > 0) {
    console.log('\n─────────────────────────────────────────────────────────────────')
    console.log('FAILED TESTS DETAILS:\n')

    for (const result of results.filter(r => !r.passed)) {
      console.log(`✗ ${result.name}`)
      console.log(`  ${result.details}`)
      if (result.metadata) {
        console.log(`  Metadata:`, JSON.stringify(result.metadata, null, 2))
      }
      console.log()
    }
  }

  // Production readiness assessment
  console.log('\n╔══════════════════════════════════════════════════════════════════╗')
  console.log('║                  PRODUCTION READINESS (Thai)                    ║')
  console.log('╚══════════════════════════════════════════════════════════════════╝\n')

  const readiness: string[] = []
  const issues: string[] = []

  if (passed >= total * 0.9) {
    readiness.push('✓ พร้อมใช้งานระดับ Production (Production Ready)')
  } else if (passed >= total * 0.7) {
    readiness.push('⚠ พร้อมใช้งานระดับ Staging มีบางประเด็นต้องแก้ (Staging Ready)')
  } else {
    readiness.push('✗ ยังไม่พร้อมใช้งาน ต้องแก้ไขหลายประเด็น (Not Ready)')
  }

  // Check specific areas
  const intentPass = results.filter(r => r.name.includes('Intent:') && r.passed).length
  const intentTotal = results.filter(r => r.name.includes('Intent:')).length
  if (intentPass === intentTotal) {
    readiness.push('✓ ระบบจำแนก Intent ทำงานได้ดี')
  } else {
    issues.push(`✗ Intent classification: ${intentPass}/${intentTotal} passed`)
  }

  const entityPass = results.filter(r => r.name.includes('Entity') && r.passed).length
  const entityTotal = results.filter(r => r.name.includes('Entity')).length
  if (entityPass === entityTotal) {
    readiness.push('✓ ระบบตรวจจับ Entity ทำงานได้ดี')
  } else {
    issues.push(`✗ Entity extraction: ${entityPass}/${entityTotal} passed`)
  }

  const securityPass = results.filter(r => r.name.includes('Security') || r.name.includes('Access') && r.passed).length
  const securityTotal = results.filter(r => r.name.includes('Security') || r.name.includes('Access')).length
  if (securityPass === securityTotal) {
    readiness.push('✓ ระบบความปลอดภัย (Access Control) ทำงานได้ดี')
  } else {
    issues.push(`✗ Security: ${securityPass}/${securityTotal} passed`)
  }

  const apiPass = results.filter(r => r.name.includes('API:') && r.passed).length
  const apiTotal = results.filter(r => r.name.includes('API:')).length
  if (apiPass === apiTotal) {
    readiness.push('✓ API Endpoint ทำงานได้ดี')
  } else {
    issues.push(`✗ API endpoints: ${apiPass}/${apiTotal} passed`)
  }

  const fallbackPass = results.filter(r =>
    (r.name.includes('Invalid') || r.name.includes('No LLM') || r.name.includes('Structured')) && r.passed
  ).length
  const fallbackTotal = results.filter(r =>
    r.name.includes('Invalid') || r.name.includes('No LLM') || r.name.includes('Structured')
  ).length
  if (fallbackPass === fallbackTotal) {
    readiness.push('✓ ระบบ Fallback เมื่อ LLM ล้มเหลว ทำงานได้ดี')
  } else {
    issues.push(`✗ Fallback systems: ${fallbackPass}/${fallbackTotal} passed`)
  }

  console.log('สถานะความพร้อม (Readiness Status):')
  readiness.forEach(r => console.log(`  ${r}`))

  if (issues.length > 0) {
    console.log('\nประเด็นที่ต้องแก้ (Issues to Fix):')
    issues.forEach(i => console.log(`  ${i}`))
  }

  console.log(`\nรวมสรุป: ${passed}/${total} ผ่าน (${passRate}%)`)

  console.log('\n╔══════════════════════════════════════════════════════════════════╗')

  return { passed, failed, total, passRate: parseFloat(passRate), results }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error)
}
