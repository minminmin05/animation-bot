#!/usr/bin/env node

/**
 * E2E INTEGRATION TEST RUNNER
 * Run with: npx tsx run-e2e-tests.ts
 */

import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
config({ path: resolve(__dirname, '.env') })

import { createClient } from '@supabase/supabase-js'
import { classifyIntent } from './rag/services/intent.service.js'
import {
  getPersonalDataByAction,
  extractStudentName
} from './services/grade.service.js'

const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || ''
const API_URL = process.env.API_URL || 'http://localhost:3001'

const TEST_ADMIN_ID = 'admin-test-id'
const TEST_ADMIN_ROLE = 'admin'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const results: any[] = []

function log(name: string, passed: boolean, details: string, meta?: any) {
  results.push({ name, passed, details, meta })
  const icon = passed ? '✓' : '✗'
  console.log(`${icon} ${name}: ${passed ? 'PASS' : 'FAIL'}`)
  console.log(`  ${details}`)
}

// ============================================================
// MAIN TEST FUNCTION
// ============================================================

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗')
  console.log('║     END-TO-END INTEGRATION TEST (Thai + English)            ║')
  console.log('╚══════════════════════════════════════════════════════════════╝\n')

  const startTime = Date.now()

  // ============================================================
  // TEST 1: Intent Classification (Thai)
  // ============================================================
  console.log('\n=== TEST 1: Intent Classification (Thai) ===')

  const thaiQuery = 'เกรดของ Ava Martinez ในเแต่ละวิชา'
  const intent1 = classifyIntent(thaiQuery, { role: 'admin' })

  log(
    `Intent: "${thaiQuery}"`,
    intent1.intent === 'personal_data',
    `Intent: ${intent1.intent}, Confidence: ${intent1.confidence.toFixed(2)}`,
    {
      query: thaiQuery,
      intent: intent1.intent,
      confidence: intent1.confidence,
      entities: intent1.detectedEntities,
      routing: intent1.routingReason
    }
  )

  // ============================================================
  // TEST 2: Intent Classification (English)
  // ============================================================
  console.log('\n=== TEST 2: Intent Classification (English) ===')

  const englishQuery = 'What are the grades of Ava Martinez?'
  const intent2 = classifyIntent(englishQuery, { role: 'admin' })

  log(
    `Intent: "${englishQuery}"`,
    intent2.intent === 'personal_data',
    `Intent: ${intent2.intent}, Confidence: ${intent2.confidence.toFixed(2)}`,
    {
      query: englishQuery,
      intent: intent2.intent,
      confidence: intent2.confidence,
      entities: intent2.detectedEntities
    }
  )

  // ============================================================
  // TEST 3: Entity Extraction
  // ============================================================
  console.log('\n=== TEST 3: Entity Extraction ===')

  const testQueries = [
    'เกรดของ Ava Martinez ในเแต่ละวิชา',
    'ข้อมูลของ Ava Martinez ที่มี',
    'Show grades for Ava Martinez',
    'Ava Martinez grades please'
  ]

  for (const q of testQueries) {
    const result = classifyIntent(q, { role: 'admin' })
    const personEntity = result.detectedEntities?.find(e => e.type === 'person_name')
    const serviceExtracted = extractStudentName(q)

    log(
      `Entity: "${q}"`,
      personEntity?.value?.includes('Ava') || false,
      personEntity?.value || 'No entity',
      {
        query: q,
        detected: personEntity?.value,
        serviceExtracted
      }
    )
  }

  // ============================================================
  // TEST 4: Database Query - Find Students
  // ============================================================
  console.log('\n=== TEST 4: Database Query ===')

  const { data: students, error: studentError } = await supabase
    .from('students')
    .select('id, name')
    .ilike('name', '%Ava%')

  log(
    'Database: Find Student "Ava"',
    !studentError && (students?.length || 0) > 0,
    studentError ? `Error: ${studentError.message}` : `Found ${students?.length || 0} student(s)`,
    { students: students?.map(s => ({ id: s.id, name: s.name })) }
  )

  // ============================================================
  // TEST 5: Create Test Data if Needed
  // ============================================================
  console.log('\n=== TEST 5: Setup Test Data ===')

  let testStudent = students?.[0]

  if (!testStudent) {
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
      log('Create Test Student', false, `Error: ${createError.message}`)
    } else {
      testStudent = newStudent
      log('Create Test Student', true, `Created: ${testStudent.name} (ID: ${testStudent.id})`)

      // Create grades
      const { data: classes } = await supabase.from('classes').select('id').limit(1)
      if (classes && classes[0]) {
        const grades = [
          { student_id: testStudent.id, class_id: classes[0].id, final_grade: 95, letter_grade: 'A', grade_points: 4.0, term: '1', academic_year: '2025' },
          { student_id: testStudent.id, class_id: classes[0].id, final_grade: 87, letter_grade: 'B+', grade_points: 3.5, term: '1', academic_year: '2025' }
        ]
        await supabase.from('student_subject_grades').insert(grades)
        log('Create Sample Grades', true, `Created ${grades.length} grades`)
      }
    }
  } else {
    log('Find Test Student', true, `Found: ${testStudent.name}`)
  }

  // ============================================================
  // TEST 6: Repository Query with Target Student
  // ============================================================
  console.log('\n=== TEST 6: Repository Query Filters ===')

  if (testStudent) {
    const gradeResult = await getPersonalDataByAction(
      'เกรดของ Ava Martinez',
      'Ava Martinez',
      TEST_ADMIN_ID,
      TEST_ADMIN_ROLE
    )

    const hasData = gradeResult.data && gradeResult.data.length > 0

    log(
      'Query: Specific Student (Ava Martinez)',
      hasData,
      hasData
        ? `Found ${gradeResult.data.length} grade records`
        : 'No data found',
      {
        action: gradeResult.action,
        recordCount: gradeResult.data?.length || 0,
        sampleData: gradeResult.data?.slice(0, 2)
      }
    )

    // ============================================================
    // TEST 7: Target Student ID Validation
    // ============================================================
    console.log('\n=== TEST 7: Target Student ID Validation ===')

    const intent = classifyIntent('เกรดของ Ava Martinez', { role: 'admin' })
    const personEntity = intent.detectedEntities?.find(e => e.type === 'person_name')

    log(
      'Entity Propagation: Intent → Service',
      personEntity?.value === 'Ava Martinez',
      personEntity?.value || 'No entity detected',
      {
        detectedPerson: personEntity?.value,
        intent: intent.intent
      }
    )
  }

  // ============================================================
  // TEST 8: Security - No Accidental ALL Queries
  // ============================================================
  console.log('\n=== TEST 8: Security - Access Control ===')

  const studentQueryResult = await getPersonalDataByAction(
    'show all grades',
    null,
    'student-123',
    'student'
  )

  const isSafe = studentQueryResult.data === undefined ||
                 studentQueryResult.data.length === 0 ||
                 studentQueryResult.error?.includes('ACCESS_DENIED') ||
                 studentQueryResult.error?.includes('UNAUTHORIZED')

  log(
    'Security: Student cannot query ALL',
    isSafe,
    isSafe
      ? 'Access control working'
      : 'WARNING: Possible security issue!',
    {
      hasData: !!studentQueryResult.data,
      dataLength: studentQueryResult.data?.length || 0,
      error: studentQueryResult.error
    }
  )

  // ============================================================
  // TEST 9: Structured Response (LLM-less)
  // ============================================================
  console.log('\n=== TEST 9: Structured Response (No LLM) ===')

  const structResult = await getPersonalDataByAction(
    'เกรดของ Ava Martinez',
    'Ava Martinez',
    TEST_ADMIN_ID,
    TEST_ADMIN_ROLE
  )

  const hasData = structResult.data && structResult.data.length > 0
  const noError = !structResult.error

  log(
    'Structured Response: Works without LLM',
    hasData && noError,
    hasData
      ? `Returned ${structResult.data.length} records (structured data)`
      : `Failed: ${structResult.error || 'No data'}`,
    {
      action: structResult.action,
      dataLength: structResult.data?.length || 0,
      error: structResult.error
    }
  )

  // ============================================================
  // TEST 10: API Endpoint (Optional)
  // ============================================================
  console.log('\n=== TEST 10: API Endpoint (Optional) ===')

  try {
    const healthResponse = await fetch(`${API_URL}/api/rag/health`, { method: 'GET' })

    if (!healthResponse.ok) {
      console.log('⚠ Server not running - skipping API tests')
    } else {
      console.log('✓ Server is running - testing API...')

      const apiResponse = await fetch(`${API_URL}/api/rag/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          question: 'เกรดของ Ava Martinez ในเแต่ละวิชา',
          userId: TEST_ADMIN_ID,
          userRole: TEST_ADMIN_ROLE
        })
      })

      const apiData = await apiResponse.json()

      log(
        'API: Thai personal query',
        !!apiData.text && apiData.text.length > 0,
        apiData.text?.substring(0, 50) || 'No response',
        {
          type: apiData.type,
          intent: apiData.intent,
          action: apiData.action,
          hasText: !!apiData.text
        }
      )
    }
  } catch {
    console.log('⚠ Server not available - skipping API tests')
  }

  // ============================================================
  // SUMMARY
  // ============================================================

  const duration = Date.now() - startTime
  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length
  const total = results.length
  const passRate = ((passed / total) * 100).toFixed(1)

  console.log('\n\n╔══════════════════════════════════════════════════════════════╗')
  console.log('║                        TEST SUMMARY                          ║')
  console.log('╚══════════════════════════════════════════════════════════════╝\n')

  console.log(`Total Tests: ${total}`)
  console.log(`Passed: ${passed}`)
  console.log(`Failed: ${failed}`)
  console.log(`Pass Rate: ${passRate}%`)
  console.log(`Duration: ${duration}ms`)

  console.log('\n─────────────────────────────────────────────────────────────')

  for (const r of results) {
    const icon = r.passed ? '✓' : '✗'
    console.log(`${icon} ${r.name}`)
  }

  if (failed > 0) {
    console.log('\n─────────────────────────────────────────────────────────────')
    console.log('FAILED TESTS:\n')

    for (const r of results.filter(r => !r.passed)) {
      console.log(`✗ ${r.name}`)
      console.log(`  ${r.details}\n`)
    }
  }

  // ============================================================
  // PRODUCTION READINESS (Thai)
  // ============================================================

  console.log('\n╔══════════════════════════════════════════════════════════════╗')
  console.log('║              การประเมินความพร้อมใช้งาน (Thai)                ║')
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
    readiness.push('✓ ระบบจำแนก Intent (Thai/English) ทำงานได้ดี')
  } else {
    issues.push(`✗ Intent: ${intentPass}/${intentTotal} passed`)
  }

  const entityPass = results.filter(r => r.name.includes('Entity:') && r.passed).length
  const entityTotal = results.filter(r => r.name.includes('Entity:')).length
  if (entityPass === entityTotal) {
    readiness.push('✓ ระบบตรวจจับ Entity (ชื่อนักเรียน) ทำงานได้ดี')
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

  const repoPass = results.filter(r =>
    (r.name.includes('Query:') || r.name.includes('Repository')) && r.passed
  ).length
  const repoTotal = results.filter(r =>
    r.name.includes('Query:') || r.name.includes('Repository')
  ).length
  if (repoPass === repoTotal) {
    readiness.push('✓ การกรองข้อมูลตามสิทธิ์ (Data Filtering) ทำงานได้ดี')
  } else {
    issues.push(`✗ Data Filtering: ${repoPass}/${repoTotal} passed`)
  }

  const structPass = results.filter(r => r.name.includes('Structured') && r.passed).length
  const structTotal = results.filter(r => r.name.includes('Structured')).length
  if (structPass === structTotal) {
    readiness.push('✓ ระบบ Fallback เมื่อ LLM ล้มเหลว ทำงานได้ดี')
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

  return { passed, failed, total, passRate: parseFloat(passRate) }
}

// Run tests
main().catch(console.error)
