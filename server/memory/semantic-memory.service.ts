/**
 * Semantic Memory Service
 *
 * Handles embedding-based retrieval of historical conversations.
 * Enables finding semantically related messages across sessions.
 */

import { supabase } from '../services/supabase.js'
import { embed } from '../embeddings/index.js'

// ============================================================
// TYPES
// ============================================================

export interface SemanticMemoryOptions {
  userId: string
  query: string
  queryEmbedding?: number[]
  sessionId?: string // Current session (to exclude from search)
  threshold?: number
  limit?: number
  minImportance?: number
}

export interface SemanticMessage {
  id: string
  session_id: string
  role: string
  content: string
  importance_score: number
  similarity: number
  created_at: string
}

export interface SemanticMemoryResult {
  messages: SemanticMessage[]
  totalFound: number
  averageSimilarity: number
  hasHighRelevance: boolean
  formatted: string
}

// ============================================================
// CONSTANTS
// ============================================================

const DEFAULT_THRESHOLD = 0.7
const DEFAULT_LIMIT = 5
const DEFAULT_MIN_IMPORTANCE = 0.3
const HIGH_RELEVANCE_THRESHOLD = 0.85

// Messages that should NOT be embedded (noise)
const SKIP_EMBEDDING_PATTERNS = [
  /^(hi|hello|hey|halo|สวัสดี|หวัดดี|ดีจ้า|ดีครับ|ดีค่ะ)$/i,
  /^(ok|okay|okok|โอ|โอเค|ได้|ใช่)$/i,
  /^(thanks|thank you|ขอบคุณ|ขอบใจ|ทุก(ครับ|คะ)|thx)$/i,
  /^(yes|no|y|n|ใช่|ไม่ใช่|ไม่)$/i,
  /^(มี|ไม่มี|have|don't have)$/i,
  /^(bye|goodbye|bye bye|สวัสดี|บาย|ลาก่อน)$/i
]

// Technical/persistent content patterns (high value)
const HIGH_VALUE_PATTERNS = [
  // Technical issues
  /error|bug|issue|problem|fix|solve|แก้|ปัญหา|error|bug/i,
  // User preferences
  /prefer|like|dislike|want|need|ชอบ|ไม่ชอบ|ต้องการ|อยากได้/i,
  // Important data
  /grade|score|attendance|schedule|payment|เกรด|คะแนน|การมาเรียน|ตาราง|ค่าเทอม/i,
  // Questions seeking information
  /how to|how do|what is|วิธี|ทำอย่างไร|คืออะไร|อย่างไร/i
]

// ============================================================
// SEMANTIC MEMORY SERVICE
// ============================================================

export class SemanticMemoryService {
  /**
   * Check if content should be embedded
   */
  shouldEmbed(content: string): boolean {
    const trimmed = content.trim()

    // Skip very short content
    if (trimmed.length < 5) return false

    // Skip low-value patterns
    for (const pattern of SKIP_EMBEDDING_PATTERNS) {
      if (pattern.test(trimmed)) return false
    }

    return true
  }

  /**
   * Check if content has high value (important to remember)
   */
  isHighValue(content: string): boolean {
    for (const pattern of HIGH_VALUE_PATTERNS) {
      if (pattern.test(content)) return true
    }
    return false
  }

  /**
   * Generate embedding for a message
   */
  async generateEmbedding(content: string): Promise<number[] | null> {
    if (!this.shouldEmbed(content)) {
      console.log('[SemanticMemory] Skipping low-value content:', content.substring(0, 50))
      return null
    }

    try {
      console.log('[SemanticMemory] Generating embedding for:', content.substring(0, 50))
      return await embed(content)
    } catch (error) {
      console.error('[SemanticMemory] Error generating embedding:', error)
      return null
    }
  }

  /**
   * Store message with embedding
   */
  async storeMessageWithEmbedding(
    messageId: string,
    content: string,
    importance: number = 0.5
  ): Promise<boolean> {
    const embedding = await this.generateEmbedding(content)

    if (!embedding) {
      // Mark as not embedded but still succeed
      await supabase
        .from('chat_messages')
        .update({ is_embedded: true, importance_score: importance })
        .eq('id', messageId)
      return false
    }

    const { error } = await supabase
      .from('chat_messages')
      .update({
        embedding,
        is_embedded: true,
        importance_score: importance
      })
      .eq('id', messageId)

    if (error) {
      console.error('[SemanticMemory] Error storing embedding:', error)
      return false
    }

    console.log('[SemanticMemory] Embedding stored for message:', messageId)
    return true
  }

  /**
   * Retrieve semantically similar messages
   */
  async retrieve(options: SemanticMemoryOptions): Promise<SemanticMemoryResult> {
    const {
      userId,
      query,
      queryEmbedding: providedEmbedding,
      sessionId,
      threshold = DEFAULT_THRESHOLD,
      limit = DEFAULT_LIMIT,
      minImportance = DEFAULT_MIN_IMPORTANCE
    } = options

    try {
      // Generate embedding for query if not provided
      const queryEmbedding = providedEmbedding || await embed(query)

      if (!queryEmbedding) {
        console.error('[SemanticMemory] Failed to generate query embedding')
        return this.emptyResult()
      }

      // Search for similar messages
      const { data, error } = await supabase
        .rpc('match_chat_messages', {
          user_id_param: userId,
          session_id_param: null, // Search across all sessions
          query_embedding: queryEmbedding,
          match_threshold: threshold,
          match_count: limit * 2, // Get more to filter
          exclude_session_id: sessionId // Exclude current session
        })

      if (error) {
        console.error('[SemanticMemory] Error searching messages:', error)
        return this.emptyResult()
      }

      // Filter by importance and deduplicate
      let messages = (data || [])
        .filter(m => m.importance_score >= minImportance)
        .slice(0, limit)

      // Calculate statistics
      const totalFound = messages.length
      const avgSimilarity = totalFound > 0
        ? messages.reduce((sum, m) => sum + m.similarity, 0) / totalFound
        : 0
      const hasHighRelevance = messages.some(m => m.similarity >= HIGH_RELEVANCE_THRESHOLD)

      // Format result
      const formatted = this.formatMessages(messages)

      return {
        messages,
        totalFound,
        averageSimilarity: avgSimilarity,
        hasHighRelevance,
        formatted
      }

    } catch (error) {
      console.error('[SemanticMemory] Error in retrieve:', error)
      return this.emptyResult()
    }
  }

  /**
   * Format messages for context
   */
  private formatMessages(messages: SemanticMessage[]): string {
    if (messages.length === 0) return ''

    const parts: string[] = []

    for (const msg of messages) {
      const roleLabel = msg.role === 'user' ? 'User' : 'Assistant'
      const date = new Date(msg.created_at).toLocaleDateString('th-TH')
      parts.push(`[${roleLabel}, ${date}] ${msg.content}`)
    }

    return `Related conversation history:\n${parts.join('\n')}`
  }

  /**
   * Create empty result
   */
  private emptyResult(): SemanticMemoryResult {
    return {
      messages: [],
      totalFound: 0,
      averageSimilarity: 0,
      hasHighRelevance: false,
      formatted: ''
    }
  }

  /**
   * Get cross-session context for a query
   * Searches across all user sessions for relevant historical context
   */
  async getCrossSessionContext(
    userId: string,
    query: string,
    currentSessionId: string
  ): Promise<string> {
    const result = await this.retrieve({
      userId,
      query,
      sessionId: currentSessionId,
      threshold: 0.75,
      limit: 3
    })

    if (result.totalFound === 0) return ''

    console.log(`[SemanticMemory] Found ${result.totalFound} related historical messages`)
    return result.formatted
  }

  /**
   * Batch update embeddings for unprocessed messages
   * Used for async background processing
   */
  async processUnembeddedMessages(limit: number = 50): Promise<number> {
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('id, content')
      .eq('is_embedded', false)
      .limit(limit)

    if (error || !messages) {
      console.error('[SemanticMemory] Error fetching unembedded messages:', error)
      return 0
    }

    let processed = 0

    for (const message of messages) {
      const success = await this.storeMessageWithEmbedding(message.id, message.content)
      if (success) processed++
    }

    console.log(`[SemanticMemory] Processed ${processed}/${messages.length} messages`)
    return processed
  }

  /**
   * Search for similar topics in conversation history
   */
  async findSimilarTopics(
    userId: string,
    topic: string,
    limit: number = 5
  ): Promise<SemanticMessage[]> {
    const result = await this.retrieve({
      userId,
      query: topic,
      threshold: 0.7,
      limit
    })

    return result.messages
  }

  /**
   * Get conversation statistics for a user
   */
  async getUserMemoryStats(userId: string): Promise<{
    totalMessages: number
    embeddedMessages: number
    avgImportance: number
    sessionsCount: number
  }> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('id, is_embedded, importance_score, session_id')
      .eq('user_id', userId)

    if (error || !data) {
      return {
        totalMessages: 0,
        embeddedMessages: 0,
        avgImportance: 0,
        sessionsCount: 0
      }
    }

    const totalMessages = data.length
    const embeddedMessages = data.filter(m => m.is_embedded).length
    const avgImportance = totalMessages > 0
      ? data.reduce((sum, m) => sum + (m.importance_score || 0), 0) / totalMessages
      : 0
    const sessionsCount = new Set(data.map(m => m.session_id)).size

    return {
      totalMessages,
      embeddedMessages,
      avgImportance,
      sessionsCount
    }
  }
}

// ============================================================
// GLOBAL INSTANCE
// ============================================================

let globalInstance: SemanticMemoryService | null = null

export function getSemanticMemoryService(): SemanticMemoryService {
  if (!globalInstance) {
    globalInstance = new SemanticMemoryService()
  }
  return globalInstance
}
