import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

async function checkSchema() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  console.log('Checking students table...')

  // Try to get a sample row to see column names
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .limit(1)

  if (error) {
    console.error('Error:', error.message)
  } else if (data && data.length > 0) {
    console.log('Column names:', Object.keys(data[0]))
    console.log('Sample data:', JSON.stringify(data[0], null, 2))
  } else {
    console.log('No data found, table might be empty')
  }
}

checkSchema().catch(console.error)
