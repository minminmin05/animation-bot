/**
 * Memory Manager Service
 *
 * Central orchestrator for all memory operations.
 * Coordinates recent memory, semantic search, summaries, and query rewriting.
 */

import { supabase } from '../services/supabase.js'
import { getRecentMemoryService, FormattedMemoryContext } from './recent-memory.service.js'
import { getSemanticMemoryService, SemanticMemoryResult } from './semantic-memory.service.js'
import { getSessionSummaryService, SessionSummary } from './summary.service.js'
import { getQueryRewriterService, RewriteResult, RewriteContext } from './query-rewriter.service.js'
import { getHybridRetrievalService, RetrievedContext, RetrievalOptions } from './hybrid-retrieval.service.js'
import { getImportanceScoringService, ImportanceResult } from './importance.service.js'

// ============================================================
// TYPES
// ============================================================

export interface ChatSession {
  id: string
  user_id: string
  title: string
  summary: string
  message_count: number
  created_at: string
  updated_at: string
}

export interface MessageToSave {
  sessionId: string
  userId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  metadata?: Record<string, unknown>
}

export interface MemoryContext {
  sessionId: string
  userId: string
  query: string
  rewrittenQuery: string
  retrievedContext: RetrievedContext
  rewriteResult: RewriteResult
}

export interface MemoryManagerConfig {
  autoSummarize: boolean
  summarizeAfterMessages: number
  embedMessages: boolean
  rewriteQueries: boolean
  maxContextTokens: number
}

// ============================================================
// CONSTANTS
// ============================================================

const DEFAULT_CONFIG: MemoryManagerConfig = {
  autoSummarize: true,
  summarizeAfterMessages: 10,
  embedMessages: true,
  rewriteQueries: true,
  maxContextTokens: 2000
}

// ============================================================
// MEMORY MANAGER SERVICE
// ============================================================

export class MemoryManagerService {
  private recentMemory = getRecentMemoryService()
  private semanticMemory = getSemanticMemoryService()
  private summaryService = getSessionSummaryService()
  private queryRewriter = getQueryRewriterService()
  private hybridRetrieval = getHybridRetrievalService()
  private importanceScoring = getImportanceScoringService()

  private config: MemoryManagerConfig = DEFAULT_CONFIG

  /**
   * Configure the memory manager
   */
  configure(config: Partial<MemoryManagerConfig>): void {
    this.config = { ...this.config, ...config }
  }

  // ============================================================
  // SESSION MANAGEMENT
  // ============================================================

  /**
   * Create a new chat session
   */
  async createSession(userId: string, title?: string): Promise<ChatSession | null> {
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: userId,
        title: title || 'New Conversation',
        summary: '',
        message_count: 0
      })
      .select()
      .single()

    if (error) {
      console.error('[MemoryManager] Error creating session:', error)
      return null
    }

    console.log('[MemoryManager] Session created:', data.id)
    return data
  }

  /**
   * Get a session by ID
   */
  async getSession(sessionId: string, userId: string): Promise<ChatSession | null> {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single()

    if (error) {
      console.error('[MemoryManager] Error fetching session:', error)
      return null
    }

    return data
  }

  /**
   * Get or create a session for a user
   */
  async getOrCreateSession(userId: string, sessionId?: string): Promise<ChatSession> {
    if (sessionId) {
      const existing = await this.getSession(sessionId, userId)
      if (existing) return existing
    }

    const created = await this.createSession(userId)
    if (!created) {
      throw new Error('Failed to create session')
    }

    return created
  }

  /**
   * Update session title
   */
  async updateSessionTitle(sessionId: string, userId: string, title: string): Promise<boolean> {
    const { error } = await supabase
      .from('chat_sessions')
      .update({ title, updated_at: new Date().toISOString() })
      .eq('id', sessionId)
      .eq('user_id', userId)

    return !error
  }

  // ============================================================
  // MESSAGE MANAGEMENT
  // ============================================================

  /**
   * Normalize message content to ensure it's always a string
   */
  private normalizeContent(content: any): string {
    if (typeof content === 'string') return content;
    if (content === null || content === undefined) return '';
    if (typeof content === 'object') {
      if (typeof content.text === 'string') return content.text;
      if (typeof content.content === 'string') return content.content;
      try {
        return JSON.stringify(content);
      } catch {
        return '[Complex Object]';
      }
    }
    return String(content);
  }

  /**
   * Save a chat message
   */
  async saveMessage(message: MessageToSave): Promise<string | null> {
    const safeContent = this.normalizeContent(message.content);

    // Debug log if we got a weird type
    if (typeof message.content !== 'string') {
      console.warn(`[MemoryManager] Warning: Received non-string message content (type: ${typeof message.content}). Normalized to:`, safeContent.substring(0, 100));
    }

    // Skip completely empty messages
    if (!safeContent.trim()) {
      console.warn('[MemoryManager] Skipping save for empty message content');
      return null;
    }

    // Calculate importance (wrapped in try/catch just in case)
    let importance = { score: 0.5, reason: 'default' };
    try {
      importance = this.importanceScoring.calculateImportance(
        safeContent,
        { role: message.role }
      );
    } catch (err) {
      console.error('[MemoryManager] Error calculating importance, using default:', err);
    }

    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        session_id: message.sessionId,
        user_id: message.userId,
        role: message.role,
        content: safeContent,
        importance_score: importance.score,
        metadata: message.metadata || {},
        is_embedded: false,
        is_processed: false
      })
      .select('id')
      .single()

    if (error) {
      console.error('[MemoryManager] Error saving message:', error)
      return null
    }

    const messageId = data.id

    // Async: Generate embedding if needed
    if (this.config.embedMessages && this.semanticMemory.shouldEmbed(safeContent)) {
      this.queueEmbedding(messageId, safeContent, importance.score)
    }

    // Check if we need to summarize
    if (this.config.autoSummarize) {
      this.checkAndSummarize(message.sessionId, message.userId)
    }

    console.log('[MemoryManager] Message saved:', messageId)
    return messageId
  }

  /**
   * Queue embedding generation (async)
   */
  private queueEmbedding(messageId: string, content: string, importance: number): void {
    // In production, this would use a proper job queue
    // For now, we'll use setImmediate for non-blocking processing
    setImmediate(async () => {
      try {
        await this.semanticMemory.storeMessageWithEmbedding(messageId, content, importance)
      } catch (error) {
        console.error('[MemoryManager] Embedding generation failed:', error)
      }
    })
  }

  /**
   * Check and trigger summarization if needed
   */
  private async checkAndSummarize(sessionId: string, userId: string): Promise<void> {
    const needs = await this.summaryService.needsSummarization(sessionId, userId)

    if (needs) {
      console.log('[MemoryManager] Triggering summarization for session:', sessionId)
      setImmediate(async () => {
        try {
          await this.summaryService.generateSummary({
            sessionId,
            userId,
            type: 'periodic'
          })
          await this.summaryService.updateSessionTitle(sessionId, userId)
        } catch (error) {
          console.error('[MemoryManager] Summarization failed:', error)
        }
      })
    }
  }

  // ============================================================
  // CONTEXT RETRIEVAL
  // ============================================================

  /**
   * Get complete memory context for a query
   */
  async getMemoryContext(
    query: string,
    sessionId: string,
    userId: string,
    options?: Partial<RetrievalOptions>
  ): Promise<MemoryContext> {
    // Step 1: Rewrite query if enabled
    let rewriteResult: RewriteResult
    let finalQuery = query

    if (this.config.rewriteQueries) {
      rewriteResult = await this.queryRewriter.rewrite(query, { sessionId, userId }, {
        useLLM: false, // Start with pattern-based
        includeSummaries: true
      })
      finalQuery = rewriteResult.rewrittenQuery

      console.log('[MemoryManager] Query rewritten:',
        rewriteResult.needsRewrite ? 'Yes' : 'No',
        `(${rewriteResult.changes.join(', ')})`
      )
    } else {
      rewriteResult = {
        originalQuery: query,
        rewrittenQuery: query,
        changes: [],
        resolvedReferences: [],
        confidence: 1.0,
        needsRewrite: false
      }
    }

    // Step 2: Retrieve from all sources
    const retrievedContext = await this.hybridRetrieval.retrieve({
      userId,
      sessionId,
      query,
      rewrittenQuery: finalQuery,
      maxTotalTokens: this.config.maxContextTokens,
      ...options
    })

    return {
      sessionId,
      userId,
      query,
      rewrittenQuery: finalQuery,
      retrievedContext,
      rewriteResult
    }
  }

  /**
   * Get formatted context for LLM prompt
   */
  async getFormattedContext(
    query: string,
    sessionId: string,
    userId: string
  ): Promise<string> {
    const context = await this.getMemoryContext(query, sessionId, userId)

    const parts: string[] = []

    // Add recent conversation
    if (context.retrievedContext.recentMemory.messages.length > 0) {
      parts.push(`Recent Conversation:\n${context.retrievedContext.recentMemory.messages.join('\n')}`)
    }

    // Add retrieved context
    if (context.retrievedContext.mergedContext) {
      parts.push(context.retrievedContext.mergedContext)
    }

    return parts.join('\n\n')
  }

  // ============================================================
  // QUERY PROCESSING
  // ============================================================

  /**
   * Process a user query with full memory support
   */
  async processQuery(
    query: string,
    sessionId: string,
    userId: string
  ): Promise<{
    query: string
    context: string
    memoryContext: MemoryContext
  }> {
    // Save user message
    await this.saveMessage({
      sessionId,
      userId,
      role: 'user',
      content: query
    })

    // Get memory context
    const memoryContext = await this.getMemoryContext(query, sessionId, userId)

    // Format for LLM
    const context = await this.getFormattedContext(query, sessionId, userId)

    return {
      query: memoryContext.rewrittenQuery,
      context,
      memoryContext
    }
  }

  /**
   * Save assistant response
   */
  async saveAssistantResponse(
    sessionId: string,
    userId: string,
    response: string,
    metadata?: Record<string, unknown>
  ): Promise<string | null> {
    return this.saveMessage({
      sessionId,
      userId,
      role: 'assistant',
      content: response,
      metadata
    })
  }

  // ============================================================
  // SESSION HISTORY
  // ============================================================

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: string, limit: number = 20): Promise<ChatSession[]> {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[MemoryManager] Error fetching user sessions:', error)
      return []
    }

    return data || []
  }

  /**
   * Get session messages
   */
  async getSessionMessages(
    sessionId: string,
    userId: string,
    limit: number = 50
  ): Promise<Array<{ role: string; content: string; created_at: string }>> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('role, content, created_at')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[MemoryManager] Error fetching session messages:', error)
      return []
    }

    return (data || []).reverse()
  }

  // ============================================================
  // SEARCH & DISCOVERY
  // ============================================================

  /**
   * Search across all user conversations
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
    createdAt: string
  }>> {
    const semanticResult = await this.semanticMemory.retrieve({
      userId,
      query,
      threshold: 0.6,
      limit
    })

    return semanticResult.messages.map(m => ({
      sessionId: m.session_id,
      messageId: m.id,
      content: m.content,
      similarity: m.similarity,
      createdAt: m.created_at
    }))
  }

  // ============================================================
  // STATISTICS & ANALYTICS
  // ============================================================

  /**
   * Get user memory statistics
   */
  async getUserStats(userId: string): Promise<{
    totalSessions: number
    totalMessages: number
    embeddedMessages: number
    avgImportance: number
    summariesCount: number
  }> {
    const [sessionsCount, memoryStats, summaries] = await Promise.all([
      supabase
        .from('chat_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
      this.semanticMemory.getUserMemoryStats(userId),
      this.summaryService.getUserSummaries(userId)
    ])

    return {
      totalSessions: sessionsCount.count || 0,
      totalMessages: memoryStats.totalMessages,
      embeddedMessages: memoryStats.embeddedMessages,
      avgImportance: memoryStats.avgImportance,
      summariesCount: summaries.length
    }
  }
}

// ============================================================
// GLOBAL INSTANCE
// ============================================================

let globalInstance: MemoryManagerService | null = null

export function getMemoryManagerService(): MemoryManagerService {
  if (!globalInstance) {
    globalInstance = new MemoryManagerService()
  }
  return globalInstance
}

export function resetMemoryManagerService(): void {
  globalInstance = null
}
