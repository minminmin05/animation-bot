/**
 * Recent Memory Service
 *
 * Handles retrieval of recent chat messages for maintaining conversation continuity.
 * Preserves pronoun references and context from the immediate conversation history.
 */

import { supabase } from '../services/supabase.js'

// ============================================================
// TYPES
// ============================================================

export interface ChatMessage {
  id: string
  session_id: string
  user_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  importance_score: number
  created_at: string
}

export interface RecentMemoryOptions {
  sessionId: string
  userId: string
  limit?: number
  minImportance?: number
  includeSystem?: boolean
  maxTokens?: number
}

export interface FormattedMemoryContext {
  messages: string[]
  tokenCount: number
  messageCount: number
  hasPronouns: boolean
  summary: string
}

// ============================================================
// CONSTANTS
// ============================================================

const DEFAULT_LIMIT = 10
const DEFAULT_MIN_IMPORTANCE = 0.0
const MAX_TOKEN_ESTIMATE = 500 // Rough token limit for recent memory
const TOKEN_PER_CHAR = 0.3 // Rough estimate: 1 Thai/English char ≈ 0.3 tokens

// Pronoun patterns that require context
const PRONOUN_PATTERNS = {
  thai: ['มัน', 'อันนั้น', 'อันนี้', 'เขา', 'เธอ', 'พวกเขา', 'พวกนั้น'],
  english: ['it', 'that', 'this', 'he', 'she', 'they', 'those']
}

// Low-value messages to potentially exclude
const LOW_VALUE_PATTERNS = [
  /^(ok|okay|okok|โอ|โอเค|ได้|ใช่)$/i,
  /^(thanks|thank you|ขอบคุณ|ขอบใจ)$/i,
  /^(yes|no|y|n|ใช่|ไม่ใช่|ไม่)$/i,
  /^(มี|ไม่มี|have|don't have)$/i
]

// ============================================================
// RECENT MEMORY SERVICE
// ============================================================

export class RecentMemoryService {
  /**
   * Retrieve recent chat messages for a session
   */
  async getRecentMessages(options: RecentMemoryOptions): Promise<ChatMessage[]> {
    const {
      sessionId,
      userId,
      limit = DEFAULT_LIMIT,
      minImportance = DEFAULT_MIN_IMPORTANCE,
      includeSystem = false
    } = options

    const { data, error } = await supabase
      .rpc('get_recent_messages', {
        user_id_param: userId,
        session_id_param: sessionId,
        limit_count: limit,
        min_importance: minImportance
      })

    if (error) {
      console.error('[RecentMemory] Error fetching recent messages:', error)
      return []
    }

    let messages = data || []

    // Filter out system messages unless requested
    if (!includeSystem) {
      messages = messages.filter(m => m.role !== 'system')
    }

    // Reverse to get chronological order (oldest first)
    return messages.reverse()
  }

  /**
   * Format recent messages into context for LLM
   */
  async formatMemoryContext(options: RecentMemoryOptions): Promise<FormattedMemoryContext> {
    const messages = await this.getRecentMessages(options)

    // Filter out low-value messages for context
    const filteredMessages = messages.filter(m => !this.isLowValueMessage(m.content))

    // Build formatted message strings
    const formattedMessages: string[] = []
    let totalTokens = 0

    for (const message of filteredMessages) {
      const formatted = this.formatMessage(message)
      const estimatedTokens = Math.ceil(formatted.length * TOKEN_PER_CHAR)

      // Check if we've exceeded token budget
      if (totalTokens + estimatedTokens > (options.maxTokens || MAX_TOKEN_ESTIMATE)) {
        break
      }

      formattedMessages.push(formatted)
      totalTokens += estimatedTokens
    }

    // Detect if context contains pronouns that need resolution
    const hasPronouns = this.detectPronouns(formattedMessages.join(' '))

    // Create summary
    const summary = this.createSummary(filteredMessages)

    return {
      messages: formattedMessages,
      tokenCount: totalTokens,
      messageCount: formattedMessages.length,
      hasPronouns,
      summary
    }
  }

  /**
   * Format a single message for context
   */
  private formatMessage(message: ChatMessage): string {
    const roleLabel = {
      user: 'User',
      assistant: 'Assistant',
      system: 'System'
    }[message.role]

    return `${roleLabel}: ${message.content}`
  }

  /**
   * Check if a message is low-value (noise)
   */
  private isLowValueMessage(content: string): boolean {
    const trimmed = content.trim()

    // Very short messages
    if (trimmed.length < 3) return true

    // Match low-value patterns
    for (const pattern of LOW_VALUE_PATTERNS) {
      if (pattern.test(trimmed)) return true
    }

    return false
  }

  /**
   * Detect pronouns in text that require context
   */
  private detectPronouns(text: string): boolean {
    const lower = text.toLowerCase()

    // Check Thai pronouns
    for (const pronoun of PRONOUN_PATTERNS.thai) {
      if (lower.includes(pronoun)) return true
    }

    // Check English pronouns (with word boundaries)
    for (const pronoun of PRONOUN_PATTERNS.english) {
      const pattern = new RegExp(`\\b${pronoun}\\b`, 'i')
      if (pattern.test(lower)) return true
    }

    return false
  }

  /**
   * Create a brief summary of recent messages
   */
  private createSummary(messages: ChatMessage[]): string {
    if (messages.length === 0) return ''

    const userMessages = messages.filter(m => m.role === 'user')
    const assistantMessages = messages.filter(m => m.role === 'assistant')

    const topics = this.extractTopics(userMessages.map(m => m.content))

    if (topics.length === 0) {
      return `Recent conversation with ${messages.length} messages`
    }

    return `Recent conversation about: ${topics.join(', ')}`
  }

  /**
   * Extract main topics from messages
   */
  private extractTopics(contents: string[]): string[] {
    const topics: string[] = []

    // Simple keyword extraction for Thai and English
    const topicIndicators = [
      'เกรด', 'คะแนน', 'grade', 'score',
      'การมาเรียน', 'attendance',
      'ตารางเรียน', 'schedule',
      'ค่าเทอม', 'tuition',
      'วิชา', 'subject',
      'ห้องเรียน', 'classroom'
    ]

    for (const content of contents) {
      for (const indicator of topicIndicators) {
        if (content.toLowerCase().includes(indicator.toLowerCase())) {
          if (!topics.includes(indicator)) {
            topics.push(indicator)
          }
        }
      }
    }

    return topics.slice(0, 3) // Max 3 topics
  }

  /**
   * Get conversation continuity context
   * Returns the most recent exchanges to maintain conversation flow
   */
  async getContinuityContext(options: RecentMemoryOptions): Promise<string> {
    const { messages } = await this.formatMemoryContext({
      ...options,
      limit: 6 // Focus on very recent messages
    })

    if (messages.length === 0) return ''

    return `Recent conversation:\n${messages.join('\n')}`
  }

  /**
   * Check if conversation needs context (has pronouns or references)
   */
  async needsContext(query: string, options: RecentMemoryOptions): Promise<boolean> {
    // Check if query itself has pronouns
    if (this.detectPronouns(query)) return true

    // Check if recent messages contain relevant context
    const context = await this.formatMemoryContext(options)
    return context.hasPronouns || context.messageCount > 2
  }

  /**
   * Get last assistant message for continuity
   */
  async getLastAssistantMessage(sessionId: string, userId: string): Promise<ChatMessage | null> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .eq('role', 'assistant')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) return null
    return data
  }

  /**
   * Get last user message for context
   */
  async getLastUserMessage(sessionId: string, userId: string): Promise<ChatMessage | null> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .eq('role', 'user')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) return null
    return data
  }
}

// ============================================================
// GLOBAL INSTANCE
// ============================================================

let globalInstance: RecentMemoryService | null = null

export function getRecentMemoryService(): RecentMemoryService {
  if (!globalInstance) {
    globalInstance = new RecentMemoryService()
  }
  return globalInstance
}
