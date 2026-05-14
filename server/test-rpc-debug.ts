import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { embed } from './embeddings/index.js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

async function test() {
  const query = 'เครื่องแบบนักเรียน'

  console.log('1. Generating embedding for:', query)
  const embedding = await embed(query)
  console.log('   Embedding dimensions:', embedding.length)
  console.log('   First 5 values:', embedding.slice(0, 5))

  console.log('\n2. Calling match_knowledge_base RPC...')
  const { data, error } = await supabase.rpc('match_knowledge_base', {
    query_embedding: embedding,
    match_threshold: 0.5,
    match_count: 5
  })

  if (error) {
    console.error('   ERROR:', error)
  } else {
    console.log('   SUCCESS! Found', data?.length || 0, 'results')
    data?.forEach((r: any, i: number) => {
      console.log(`   [${i + 1}] Similarity: ${(r.similarity * 100).toFixed(1)}% - ${r.content.substring(0, 50)}...`)
    })
  }
}

test().catch(console.error)
