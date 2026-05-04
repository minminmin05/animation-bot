import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

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
