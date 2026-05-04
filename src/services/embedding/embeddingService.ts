const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

export async function embedAndStore(
  text: string,
  category?: string
): Promise<{ id: string }> {
  const response = await fetch(`${API_BASE}/api/rag/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, category })
  })

  if (!response.ok) throw new Error('Failed to embed')

  return response.json()
}

export async function queryEmbeddings(query: string): Promise<QueryResult[]> {
  const response = await fetch(`${API_BASE}/api/rag/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: query })
  })

  if (!response.ok) throw new Error('Failed to query')

  const data = await response.json()
  return data.results
}

export interface QueryResult {
  id: string
  score: number
  text: string
  category?: string
}

export interface AIResponse {
  text: string
  emotion: 'neutral' | 'happy' | 'concerned' | 'helpful'
  tts: string
  sources: QueryResult[]
}

export async function askAI(question: string): Promise<AIResponse> {
  const response = await fetch(`${API_BASE}/api/rag/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question })
  })

  if (!response.ok) throw new Error('Failed to get AI response')

  return response.json()
}
