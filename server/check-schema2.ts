import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

async function checkSchema() {
  const { data } = await supabase
    .from('knowledge_base')
    .select('*')
    .limit(1)

  console.log('Sample row:', JSON.stringify(data, null, 2))
}

checkSchema().catch(console.error)
