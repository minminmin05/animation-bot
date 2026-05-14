/**
 * Conversational Pipeline Service
 *
 * Memory-aware pipeline that integrates all memory layers
 * for context-aware response generation.
 */

import { getMemoryManagerService, MemoryContext } from './memory-manager.service.js'
import { generateAnswer, LLMResponse } from '../rag/services/llm.service.js'

// ============================================================
// TYPES
// ============================================================

export interface ConversationalRequest {
  query: string
  userId: string
  sessionId?: string
  userRole?: 'student' | 'teacher' | 'parent' | 'admin'
  metadata?: Record<string, unknown>
}

export interface ConversationalResponse {
  response: LLMResponse
  context: {
    originalQuery: string
    rewrittenQuery: string
    sourcesUsed: string[]
    memorySources: {
      recent: number
      semantic: number
      summaries: number
      rag: number
    }
    tokensUsed: number
  }
  messageId: string
  userMessageId?: string
  sessionId: string
}

export interface PipelineConfig {
  enableMemory: boolean
  enableQueryRewriting: boolean
  enableRAG: boolean
  maxContextTokens: number
  responseTemperature: number
}

// ============================================================
// CONSTANTS
// ============================================================

const DEFAULT_CONFIG: PipelineConfig = {
  enableMemory: true,
  enableQueryRewriting: true,
  enableRAG: true,
  maxContextTokens: 2000,
  responseTemperature: 0.7
}

// ============================================================
// CONVERSATIONAL PIPELINE SERVICE
// ============================================================

export class ConversationalPipelineService {
  private memoryManager = getMemoryManagerService()
  private config: PipelineConfig = DEFAULT_CONFIG

  /**
   * Configure the pipeline
   */
  configure(config: Partial<PipelineConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Process a conversational request
   */
  async process(request: ConversationalRequest): Promise<ConversationalResponse> {
    console.log(`\n${'='.repeat(70)}`)
    console.log(`[ConversationalPipeline] Processing request from user: ${request.userId}`)
    console.log(`[ConversationalPipeline] Query: "${request.query}"`)
    console.log(`[ConversationalPipeline] ${'='.repeat(70)}`)

    // Step 1: Get or create session
    const session = await this.memoryManager.getOrCreateSession(
      request.userId,
      request.sessionId
    )

    // Step 2: Process query with memory
    const queryResult = await this.memoryManager.processQuery(
      request.query,
      session.id,
      request.userId
    )

    // Step 3: Generate response
    const response = await this.generateResponse(
      queryResult.query,
      queryResult.context,
      request.userRole
    )

    // Step 4: Save assistant response
    const messageId = await this.memoryManager.saveAssistantResponse(
      session.id,
      request.userId,
      response.text,
      {
        sources: response.sources,
        emotion: response.emotion,
        context_used: this.analyzeContextUsage(queryResult.memoryContext)
      }
    )

    // Step 5: Build response metadata
    const context = {
      originalQuery: queryResult.memoryContext.query,
      rewrittenQuery: queryResult.memoryContext.rewrittenQuery,
      sourcesUsed: response.sources.map(s => s.category || s.content?.substring(0, 50) || 'unknown'),
      memorySources: {
        recent: queryResult.memoryContext.retrievedContext.recentMemory.messageCount,
        semantic: queryResult.memoryContext.retrievedContext.semanticHistory.totalFound,
        summaries: queryResult.memoryContext.retrievedContext.summaries.length,
        rag: queryResult.memoryContext.retrievedContext.ragDocuments.length
      },
      tokensUsed: queryResult.memoryContext.retrievedContext.estimatedTokens
    }

    console.log(`[ConversationalPipeline] Response generated (${response.text.length} chars)`)
    console.log(`[ConversationalPipeline] Memory sources:`, context.memorySources)

    return {
      response,
      context,
      messageId: messageId || '',
      userMessageId: queryResult.userMessageId,
      sessionId: session.id
    }
  }

  /**
   * Generate response with context
   */
  private async generateResponse(
    query: string,
    context: string,
    userRole?: string
  ): Promise<LLMResponse> {
    // Build enhanced prompt with memory context
    const prompt = this.buildPrompt(query, context, userRole)

    try {
      // Generate response using existing LLM service
      const response = await generateAnswer(
        query,
        this.contextToSources(context),
        context
      )

      return response
    } catch (error) {
      console.error('[ConversationalPipeline] Error generating response:', error)

      // Fallback response
      return {
        text: 'ขออภัย ระบบไม่สามารถตอบได้ในขณะนี้ กรุณาลองใหม่ภายหลัง',
        emotion: 'concerned',
        tts: 'ขออภัย ระบบไม่สามารถตอบได้ในขณะนี้ กรุณาลองใหม่ภายหลัง',
        sources: []
      }
    }
  }

  /**
   * Build prompt with memory context
   */
  private buildPrompt(
    query: string,
    context: string,
    userRole?: string
  ): string {
    const parts: string[] = []

    // System instruction
    parts.push(`คุณเป็นผู้ช่วย AI ของโรงเรียนที่ฉลาดและเป็นมิตร

คำแนะนำ:
- ตอบคำถามโดยใช้ข้อมูลจาก Context ที่ให้มา
- สนใจประวัติการสนทนาที่ผ่านมา
- ตอบเป็นภาษาไทยสุภาพ เป็นกันเอง
- หากไม่มีข้อมูลที่เกี่ยวข้อง ให้บอกว่าไม่มีข้อมูลอย่างสุภาพ`)

    // Add user role context if available
    if (userRole) {
      const roleLabels = {
        student: 'นักเรียน',
        teacher: 'ครู',
        parent: 'ผู้ปกครอง',
        admin: 'ผู้บริหาร'
      }
      parts.push(`ผู้ใช้งาน: ${roleLabels[userRole] || userRole}`)
    }

    // Add memory context
    if (context) {
      parts.push(`\nบริบทการสนทนา:\n${context}`)
    }

    // Add query
    parts.push(`\nคำถาม: ${query}`)

    return parts.join('\n')
  }

  /**
   * Convert context string to sources format
   */
  private contextToSources(context: string): Array<{
    category: string
    content: string
    similarity?: number
  }> {
    // Parse context to extract sources
    const sources: Array<{ category: string; content: string; similarity?: number }> = []

    // Extract RAG sources (marked with [Knowledge: ...])
    const ragMatches = context.match(/\[Knowledge: ([^\]]+)\] ([^\n]+)/g)
    if (ragMatches) {
      for (const match of ragMatches) {
        const parts = match.match(/\[Knowledge: ([^\]]+)\] (.+)/)
        if (parts) {
          sources.push({
            category: parts[1],
            content: parts[2],
            similarity: 0.8
          })
        }
      }
    }

    return sources
  }

  /**
   * Analyze which memory sources were used
   */
  private analyzeContextUsage(memoryContext: MemoryContext): {
    usedRecent: boolean
    usedSemantic: boolean
    usedSummaries: boolean
    usedRAG: boolean
    totalSources: number
  } {
    const { retrievedContext } = memoryContext

    return {
      usedRecent: retrievedContext.recentMemory.messageCount > 0,
      usedSemantic: retrievedContext.semanticHistory.totalFound > 0,
      usedSummaries: retrievedContext.summaries.length > 0,
      usedRAG: retrievedContext.ragDocuments.length > 0,
      totalSources:
        retrievedContext.recentMemory.messageCount +
        retrievedContext.semanticHistory.totalFound +
        retrievedContext.summaries.length +
        retrievedContext.ragDocuments.length
    }
  }

  /**
   * Get conversation history for a session
   */
  async getHistory(
    sessionId: string,
    userId: string,
    limit: number = 50
  ): Promise<Array<{ id: string; role: string; content: string; timestamp: string }>> {
    const messages = await this.memoryManager.getSessionMessages(sessionId, userId, limit)

    return messages.map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: m.created_at
    }))
  }

  /**
   * Get user's conversation sessions
   */
  async getSessions(userId: string, limit: number = 20): Promise<Array<{
    id: string
    title: string
    messageCount: number
    updatedAt: string
  }>> {
    const sessions = await this.memoryManager.getUserSessions(userId, limit)

    return sessions.map(s => ({
      id: s.id,
      title: s.title,
      messageCount: s.message_count,
      updatedAt: s.updated_at
    }))
  }

  /**
   * Search across user's conversations
   */
  async searchConversations(
    userId: string,
    query: string,
    limit: number = 10
  ): Promise<Array<{
    sessionId: string
    messageId: string
    content: string
    similarity: number
    timestamp: string
  }>> {
    const results = await this.memoryManager.searchConversations(userId, query, limit)

    return results.map(r => ({
      sessionId: r.sessionId,
      messageId: r.messageId,
      content: r.content,
      similarity: r.similarity,
      timestamp: r.createdAt
    }))
  }

  /**
   * Clear session history (with confirmation)
   */
  async clearSession(sessionId: string, userId: string): Promise<boolean> {
    const { supabase } = await import('../services/supabase.js')

    // Delete messages
    const { error: msgError } = await supabase
      .from('chat_messages')
      .delete()
      .eq('session_id', sessionId)
      .eq('user_id', userId)

    // Delete summaries
    const { error: sumError } = await supabase
      .from('session_summaries')
      .delete()
      .eq('session_id', sessionId)
      .eq('user_id', userId)

    // Update session
    const { error: sessionError } = await supabase
      .from('chat_sessions')
      .update({
        message_count: 0,
        summary: '',
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .eq('user_id', userId)

    return !msgError && !sumError && !sessionError
  }

  /**
   * Export session data
   */
  async exportSession(sessionId: string, userId: string): Promise<{
    session: any
    messages: any[]
    summaries: any[]
  } | null> {
    const { supabase } = await import('../services/supabase.js')

    const [session, messages, summaries] = await Promise.all([
      supabase.from('chat_sessions').select('*').eq('id', sessionId).eq('user_id', userId).single(),
      supabase.from('chat_messages').select('*').eq('session_id', sessionId).eq('user_id', userId),
      supabase.from('session_summaries').select('*').eq('session_id', sessionId).eq('user_id', userId)
    ])

    if (session.error) return null

    return {
      session: session.data,
      messages: messages.data || [],
      summaries: summaries.data || []
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId: string): Promise<{
    totalSessions: number
    totalMessages: number
    embeddedMessages: number
    avgImportance: number
    summariesCount: number
  }> {
    return this.memoryManager.getUserStats(userId)
  }
}

// ============================================================
// GLOBAL INSTANCE
// ============================================================

let globalInstance: ConversationalPipelineService | null = null

export function getConversationalPipelineService(): ConversationalPipelineService {
  if (!globalInstance) {
    globalInstance = new ConversationalPipelineService()
  }
  return globalInstance
}

export function resetConversationalPipelineService(): void {
  globalInstance = null
}
