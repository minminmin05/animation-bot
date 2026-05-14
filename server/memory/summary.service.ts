/**
 * Session Summary Service
 *
 * Handles automatic conversation summarization for memory compression.
 * Creates and updates summaries to preserve conversation context.
 */

import { supabase } from '../services/supabase.js'
import { embed } from '../embeddings/index.js'
import { generateWithProvider, LLMProvider } from '../rag/services/llm.service.js'

// ============================================================
// TYPES
// ============================================================

export interface SessionSummary {
  id: string
  session_id: string
  user_id: string
  summary: string
  summary_type: 'auto' | 'manual' | 'periodic'
  message_count: number
  time_span_start: string
  time_span_end: string
  created_at: string
  updated_at: string
}

export interface SummaryOptions {
  sessionId: string
  userId: string
  type?: 'auto' | 'manual' | 'periodic'
  messageLimit?: number
  sinceSummaryId?: string
}

export interface SummaryGenerationOptions {
  includeTopics: boolean
  includeEntities: boolean
  includeUserGoals: boolean
  maxLength: number
}

// ============================================================
// CONSTANTS
// ============================================================

const DEFAULT_SUMMARY_LENGTH = 300
const MIN_MESSAGES_FOR_SUMMARY = 5
const SUMMARY_THRESHOLD_MESSAGES = 10 // Summarize after 10 new messages

// ============================================================
// SESSION SUMMARY SERVICE
// ============================================================

export class SessionSummaryService {
  /**
   * Get current summary for a session
   */
  async getCurrentSummary(sessionId: string, userId: string): Promise<SessionSummary | null> {
    const { data, error } = await supabase
      .from('session_summaries')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('[SummaryService] Error fetching summary:', error)
      return null
    }

    return data
  }

  /**
   * Generate summary for a session
   */
  async generateSummary(
    options: SummaryOptions,
    genOptions: Partial<SummaryGenerationOptions> = {}
  ): Promise<SessionSummary | null> {
    const {
      sessionId,
      userId,
      type = 'auto',
      messageLimit = 50,
      sinceSummaryId
    } = options

    const opts: SummaryGenerationOptions = {
      includeTopics: true,
      includeEntities: true,
      includeUserGoals: true,
      maxLength: DEFAULT_SUMMARY_LENGTH,
      ...genOptions
    }

    // Fetch messages to summarize
    const messages = await this.fetchMessagesToSummarize(
      sessionId,
      userId,
      messageLimit,
      sinceSummaryId
    )

    if (messages.length < MIN_MESSAGES_FOR_SUMMARY) {
      console.log('[SummaryService] Not enough messages to summarize:', messages.length)
      return null
    }

    // Generate summary text
    const summaryText = await this.generateSummaryText(messages, opts)

    if (!summaryText) {
      console.error('[SummaryService] Failed to generate summary text')
      return null
    }

    // Generate embedding for the summary
    const embedding = await embed(summaryText)

    // Calculate time span
    const timeSpan = this.calculateTimeSpan(messages)

    // Create or update summary
    const summaryData = {
      session_id: sessionId,
      user_id: userId,
      summary: summaryText,
      summary_type: type,
      message_count: messages.length,
      time_span_start: timeSpan.start,
      time_span_end: timeSpan.end,
      embedding
    }

    // Check if we should update existing or create new
    const existing = sinceSummaryId
      ? await this.getSummaryById(sinceSummaryId)
      : await this.getCurrentSummary(sessionId, userId)

    let result

    if (existing && type === 'periodic') {
      // Update existing periodic summary
      const { data, error } = await supabase
        .from('session_summaries')
        .update({
          ...summaryData,
          message_count: existing.message_count + messages.length,
          time_span_start: existing.time_span_start < timeSpan.start ? existing.time_span_start : timeSpan.start
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        console.error('[SummaryService] Error updating summary:', error)
        return null
      }
      result = data
    } else {
      // Create new summary
      const { data, error } = await supabase
        .from('session_summaries')
        .insert(summaryData)
        .select()
        .single()

      if (error) {
        console.error('[SummaryService] Error creating summary:', error)
        return null
      }
      result = data
    }

    console.log('[SummaryService] Summary generated:', result.id)
    return result
  }

  /**
   * Fetch messages to summarize
   */
  private async fetchMessagesToSummarize(
    sessionId: string,
    userId: string,
    limit: number,
    sinceSummaryId?: string
  ): Promise<Array<{ role: string; content: string; created_at: string }>> {
    let query = supabase
      .from('chat_messages')
      .select('role, content, created_at')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    // If we have a summary start point, get messages since then
    if (sinceSummaryId) {
      const summary = await this.getSummaryById(sinceSummaryId)
      if (summary) {
        query = query.gte('created_at', summary.time_span_end)
      }
    }

    const { data, error } = await query.limit(limit)

    if (error) {
      console.error('[SummaryService] Error fetching messages:', error)
      return []
    }

    return data || []
  }

  /**
   * Generate summary text using LLM
   */
  private async generateSummaryText(
    messages: Array<{ role: string; content: string; created_at: string }>,
    options: SummaryGenerationOptions
  ): Promise<string | null> {
    // Format messages for LLM
    const conversation = messages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n')

    const prompt = `สรุปการสนทนาต่อไปนี้เป็นภาษาไทย สั้นกระชับ แต่อย่าลืมข้อมูลสำคัญ:

${conversation}

สิ่งที่ต้องรวมในสรุป:
${options.includeTopics ? '- หัวข้อที่คุยกัน' : ''}
${options.includeEntities ? '- ข้อมูลสำคัญ (ชื่อ ตัวเลข วันที่)' : ''}
${options.includeUserGoals ? '- เป้าหมายของผู้ใช้' : ''}

สรุป (ไม่เกิน ${options.maxLength} คำ):`

    try {
      const provider = (process.env.LLM_PROVIDER as LLMProvider) || 'minimax'
      const result = await generateWithProvider(provider, prompt)

      return result.trim()
    } catch (error) {
      console.error('[SummaryService] Error generating summary with LLM:', error)

      // Fallback: simple summary
      return this.generateSimpleSummary(messages, options)
    }
  }

  /**
   * Generate simple summary without LLM
   */
  private generateSimpleSummary(
    messages: Array<{ role: string; content: string; created_at: string }>,
    options: SummaryGenerationOptions
  ): string {
    const userMessages = messages.filter(m => m.role === 'user')

    // Extract topics
    const topics = new Set<string>()
    const topicKeywords = [
      'เกรด', 'คะแนน', 'grade', 'score',
      'การมาเรียน', 'attendance',
      'ตารางเรียน', 'schedule',
      'ค่าเทอม', 'tuition'
    ]

    for (const msg of userMessages) {
      for (const keyword of topicKeywords) {
        if (msg.content.toLowerCase().includes(keyword.toLowerCase())) {
          topics.add(keyword)
        }
      }
    }

    // Build summary
    const parts: string[] = []

    if (topics.size > 0) {
      parts.push(`คุยเรื่อง: ${Array.from(topics).join(', ')}`)
    }

    parts.push(`${messages.length} ข้อความในการสนทนา`)

    return parts.join('. ')
  }

  /**
   * Calculate time span for messages
   */
  private calculateTimeSpan(messages: Array<{ created_at: string }>): {
    start: string
    end: string
  } {
    if (messages.length === 0) {
      const now = new Date().toISOString()
      return { start: now, end: now }
    }

    const start = messages[0].created_at
    const end = messages[messages.length - 1].created_at

    return { start, end }
  }

  /**
   * Get summary by ID
   */
  async getSummaryById(summaryId: string): Promise<SessionSummary | null> {
    const { data, error } = await supabase
      .from('session_summaries')
      .select('*')
      .eq('id', summaryId)
      .single()

    if (error) {
      console.error('[SummaryService] Error fetching summary by ID:', error)
      return null
    }

    return data
  }

  /**
   * Check if session needs summarization
   */
  async needsSummarization(sessionId: string, userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('message_count, last_summary_at')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single()

    if (error || !data) return false

    // Check message count
    const { count } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)

    return (count || 0) >= SUMMARY_THRESHOLD_MESSAGES
  }

  /**
   * Get all summaries for a user
   */
  async getUserSummaries(userId: string): Promise<SessionSummary[]> {
    const { data, error } = await supabase
      .from('session_summaries')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('[SummaryService] Error fetching user summaries:', error)
      return []
    }

    return data || []
  }

  /**
   * Search semantically similar summaries
   */
  async searchSimilarSummaries(
    userId: string,
    query: string,
    threshold: number = 0.65,
    limit: number = 3
  ): Promise<SessionSummary[]> {
    try {
      const queryEmbedding = await embed(query)

      if (!queryEmbedding) return []

      const { data, error } = await supabase
        .rpc('match_session_summaries', {
          user_id_param: userId,
          query_embedding: queryEmbedding,
          match_threshold: threshold,
          match_count: limit
        })

      if (error) {
        console.error('[SummaryService] Error searching summaries:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('[SummaryService] Error in searchSimilarSummaries:', error)
      return []
    }
  }

  /**
   * Format summary for context
   */
  formatSummaryForContext(summary: SessionSummary): string {
    return `[สรุปการสนทนา] ${summary.summary}`
  }

  /**
   * Update session title based on conversation
   */
  async updateSessionTitle(sessionId: string, userId: string): Promise<boolean> {
    const messages = await this.fetchMessagesToSummarize(sessionId, userId, 10)

    if (messages.length === 0) return false

    // Generate title from first few user messages
    const userMessages = messages.filter(m => m.role === 'user').slice(0, 3)

    if (userMessages.length === 0) return false

    // Extract key topics
    const topics = new Set<string>()
    const topicKeywords = [
      'เกรด', 'คะแนน', 'grade',
      'การมาเรียน', 'attendance',
      'ตารางเรียน', 'schedule',
      'ค่าเทอม', 'tuition'
    ]

    for (const msg of userMessages) {
      for (const keyword of topicKeywords) {
        if (msg.content.toLowerCase().includes(keyword.toLowerCase())) {
          topics.add(keyword)
        }
      }
    }

    // Create title
    let title = userMessages[0].content.substring(0, 50)
    if (topics.size > 0) {
      title = `${Array.from(topics).join(', ')}`
    }

    // Update session
    const { error } = await supabase
      .from('chat_sessions')
      .update({ title })
      .eq('id', sessionId)
      .eq('user_id', userId)

    return !error
  }
}

// ============================================================
// GLOBAL INSTANCE
// ============================================================

let globalInstance: SessionSummaryService | null = null

export function getSessionSummaryService(): SessionSummaryService {
  if (!globalInstance) {
    globalInstance = new SessionSummaryService()
  }
  return globalInstance
}
