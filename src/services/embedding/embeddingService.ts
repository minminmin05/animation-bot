export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

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
  intent?: string
  routing?: string
  requiresAuth?: boolean
}

export interface UserContext {
  userId?: string
  userRole?: 'student' | 'teacher' | 'parent' | 'admin'
  sessionId?: string
  token?: string
}

export async function askAI(question: string, userContext?: UserContext): Promise<AIResponse> {
  const response = await fetch(`${API_BASE}/api/memory/chat`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...(userContext?.token ? { 'Authorization': `Bearer ${userContext.token}` } : {})
    },
    body: JSON.stringify({
      query: question,
      userId: userContext?.userId,
      userRole: userContext?.userRole,
      sessionId: userContext?.sessionId
    })
  })

  if (!response.ok) throw new Error('Failed to get AI response')

  const data = await response.json()
  
  if (!data.success) {
    throw new Error(data.error || 'Failed to get AI response')
  }

  return {
    text: data.response.text,
    emotion: data.response.emotion,
    tts: data.response.tts,
    sources: data.context || [],
    sessionId: data.sessionId,
    messageId: data.messageId,
    userMessageId: data.userMessageId
  } as AIResponse & { sessionId?: string; messageId?: string; userMessageId?: string }
}

export async function getChatHistory(sessionId: string, userId?: string, token?: string) {
  const url = new URL(`${API_BASE}/api/memory/sessions/${sessionId}`);
  if (userId) {
    url.searchParams.append('userId', userId);
  }
  const response = await fetch(url.toString(), {
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  });
  if (!response.ok) throw new Error('Failed to get chat history');
  return response.json();
}

// Test intent classification
export async function testIntent(question: string, userContext?: UserContext) {
  const response = await fetch(`${API_BASE}/api/rag/intent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question,
      userId: userContext?.userId,
      userRole: userContext?.userRole
    })
  })

  if (!response.ok) throw new Error('Failed to classify intent')

  return response.json()
}
