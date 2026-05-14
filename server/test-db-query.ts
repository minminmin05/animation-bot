import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

async function testDatabaseQuery() {
  console.log('=== Testing Database Query ===\n')

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  console.log('Querying students table...')
  const { data: students, error } = await supabase
    .from('students')
    .select('first_name, last_name, student_id')
    .limit(10)

  console.log('Error:', error)
  console.log('Students:', students?.length || 0)

  if (students && students.length > 0) {
    console.log('\nSample students:')
    students.forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.first_name} ${s.last_name} (${s.student_id})`)
    })
  }
}

testDatabaseQuery().catch(console.error)
