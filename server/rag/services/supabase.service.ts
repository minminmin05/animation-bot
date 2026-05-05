import { createClient } from '@supabase/supabase-js'

// Safety check for environment variables
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error(
    'Missing Supabase credentials. Please ensure SUPABASE_URL and SUPABASE_SERVICE_KEY are set in server/.env file.'
  )
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

export interface SearchResult {
  id: string
  content: string
  category: string
  similarity: number
}

export async function getKnowledgeBase() {
  const { data, error } = await supabase
    .from('knowledge_base')
    .select('id, content, category')

  if (error) throw error
  return data
}

export async function insertKnowledgeBase(data: {
  id?: string
  content: string
  category?: string
  title?: string
  embedding: number[]
  metadata?: Record<string, any>
}) {
  const { error } = await supabase
    .from('knowledge_base')
    .insert(data)

  if (error) throw error
}

export async function searchByEmbedding(
  embedding: number[],
  limit: number = 3,
  threshold: number = 0.75
): Promise<SearchResult[]> {
  const { data, error } = await supabase.rpc('match_knowledge_base', {
    query_embedding: embedding,
    match_threshold: threshold,
    match_count: limit
  })

  if (error) {
    console.error('[Supabase] Search error:', error)
    return []
  }

  return data || []
}
