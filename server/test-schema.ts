import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

// Load .env from server directory
config({ path: resolve(process.cwd(), '../server/.env') })

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

async function checkSchema() {
  console.log('=== Checking Supabase Schema ===\n')

  // Check student_class_enrollments structure
  console.log('1. student_class_enrollments:')
  const { data: enrollments, error: e1 } = await supabase
    .from('student_class_enrollments')
    .select('*')
    .limit(1)

  if (e1) {
    console.log('   Error:', e1.message)
  } else if (enrollments && enrollments.length > 0) {
    console.log('   Columns:', Object.keys(enrollments[0]))
    console.log('   Sample:', enrollments[0])
  } else {
    console.log('   No data')
  }

  // Check class_sections structure
  console.log('\n2. class_sections:')
  const { data: sections, error: e2 } = await supabase
    .from('class_sections')
    .select('*')
    .limit(1)

  if (e2) {
    console.log('   Error:', e2.message)
  } else if (sections && sections.length > 0) {
    console.log('   Columns:', Object.keys(sections[0]))
    console.log('   Sample:', sections[0])
  } else {
    console.log('   No data')
  }

  // Check teacher_class_assignments structure
  console.log('\n3. teacher_class_assignments:')
  const { data: assignments, error: e3 } = await supabase
    .from('teacher_class_assignments')
    .select('*')
    .limit(1)

  if (e3) {
    console.log('   Error:', e3.message)
  } else if (assignments && assignments.length > 0) {
    console.log('   Columns:', Object.keys(assignments[0]))
    console.log('   Sample:', assignments[0])
  } else {
    console.log('   No data')
  }

  // Test the correct join path
  console.log('\n=== Testing Correct Join Path ===')
  console.log('student_class_enrollments -> class_sections')

  const { data: testJoin, error: joinError } = await supabase
    .from('student_class_enrollments')
    .select(`
      status,
      student_id,
      class_section_id,
      class_sections (
        name,
        subject,
        room_number
      )
    `)
    .limit(1)

  if (joinError) {
    console.log('   Error:', joinError.message)
    console.log('   Details:', joinError)
  } else {
    console.log('   Success! Result:', testJoin)
  }

  // Test with teacher
  console.log('\n=== Testing Full Join with Teachers ===')
  const { data: fullJoin, error: fullError } = await supabase
    .from('student_class_enrollments')
    .select(`
      status,
      student_id,
      class_sections!inner (
        name,
        subject,
        room_number,
        teacher_class_assignments (
          teachers (
            name
          )
        )
      )
    `)
    .limit(1)

  if (fullError) {
    console.log('   Error:', fullError.message)
    console.log('   Details:', fullError)
  } else {
    console.log('   Success! Result:', JSON.stringify(fullJoin, null, 2))
  }
}

checkSchema().catch(console.error)
