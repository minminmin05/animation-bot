import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env') })

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!

async function checkTables() {
  console.log('=== Checking Table Structure ===\n')

  // First, let's try to get table info using raw SQL
  const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  })

  const tables = await response.json()
  console.log('Available tables/paths:', Object.keys(tables).slice(0, 20))

  // Now check specific tables for their structure
  const tablesToCheck = [
    'students',
    'teachers',
    'classes',
    'class_sections',
    'student_class_enrollments',
    'teacher_class_assignments',
    'attendance',
    'student_subject_grades'
  ]

  for (const table of tablesToCheck) {
    console.log(`\n--- ${table} ---`)
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&limit=1`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        console.log('Columns:', Object.keys(data[0]))
        console.log('Sample:', JSON.stringify(data[0], null, 2))
      } else if (Array.isArray(data)) {
        console.log('No data (table exists but empty)')
      } else {
        console.log('Response:', data)
      }
    } else {
      const err = await res.text()
      console.log('Error:', res.status, err.substring(0, 200))
    }
  }
}

checkTables().catch(console.error)
