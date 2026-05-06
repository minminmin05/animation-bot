import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function checkSchema() {
  // Check the knowledge_base table schema
  const { data: columns, error } = await supabase
    .rpc('get_table_schema', { table_name: 'knowledge_base' })
    .catch(async () => {
      // Alternative: try to get column info directly
      const { data } = await supabase
        .from('knowledge_base')
        .select('*')
        .limit(1)
      
      if (data && data.length > 0) {
        console.log('Sample row structure:', Object.keys(data[0]))
        console.log('Sample values:', data[0])
      }
      return { data: null }
    })

  // Get sample data to infer schema
  const { data: sample } = await supabase
    .from('knowledge_base')
    .select('*')
    .limit(1)

  console.log('Knowledge Base Schema (from sample):')
  console.log(JSON.stringify(sample, null, 2))
}

checkSchema().catch(console.error)
