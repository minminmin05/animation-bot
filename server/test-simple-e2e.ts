#!/usr/bin/env node

/**
 * Simple E2E Test Script
 */

// First, load environment
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const envPath = resolve(__dirname, '.env')

console.log('Loading .env from:', envPath)
const envResult = config({ path: envPath })

if (envResult.error) {
  console.error('Error loading .env:', envResult.error)
  process.exit(1)
}

console.log('Environment loaded. SUPABASE_URL:', process.env.SUPABASE_URL?.substring(0, 30) + '...')

// Now import other modules
import { createClient } from '@supabase/supabase-js'
import { classifyIntent } from './rag/services/intent.service.js'

console.log('✓ Imports loaded')

// ============================================================
// TEST 1: Intent Classification
// ============================================================

console.log('\n=== TEST 1: Intent Classification ===')

const testQuery = 'เกรดของ Ava Martinez ในเแต่ละวิชา'
console.log('Query:', testQuery)

const intentResult = classifyIntent(testQuery, { role: 'admin' })

console.log('Intent:', intentResult.intent)
console.log('Confidence:', intentResult.confidence)
console.log('Detected Entities:', intentResult.detectedEntities)
console.log('Routing:', intentResult.routingReason)

if (intentResult.intent === 'personal_data') {
  console.log('✓ PASS: Correctly classified as personal_data')
} else {
  console.log('✗ FAIL: Expected personal_data, got', intentResult.intent)
}

// ============================================================
// TEST 2: Database Query
// ============================================================

console.log('\n=== TEST 2: Database Query ===')

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

console.log('Querying students...')

const { data: students, error: studentError } = await supabase
  .from('students')
  .select('id, name')
  .limit(5)

if (studentError) {
  console.log('✗ FAIL: Database error:', studentError.message)
} else {
  console.log('✓ PASS: Found', students?.length || 0, 'students')
  if (students && students.length > 0) {
    console.log('Sample:', students.map(s => s.name).join(', '))
  }
}

// ============================================================
// TEST 3: Grade Data Query
// ============================================================

console.log('\n=== TEST 3: Grade Data Query ===')

if (students && students.length > 0) {
  const testStudent = students[0]
  console.log('Testing grades for:', testStudent.name)

  const { data: grades, error: gradesError } = await supabase
    .from('student_subject_grades')
    .select('*')
    .eq('student_id', testStudent.id)

  if (gradesError) {
    console.log('✗ FAIL: Grades error:', gradesError.message)
  } else {
    console.log('✓ PASS: Found', grades?.length || 0, 'grade records')
    if (grades && grades.length > 0) {
      console.log('Sample grades:', grades.slice(0, 2).map(g => `${g.final_grade} (${g.letter_grade})`).join(', '))
    }
  }
}

// ============================================================
// SUMMARY
// ============================================================

console.log('\n=== Test Summary ===')
console.log('Tests completed. Review results above.')
