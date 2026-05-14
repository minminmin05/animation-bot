/**
 * Async Memory Processor Service
 *
 * Handles background processing of memory operations:
 * - Embedding generation
 * - Summary updates
 * - Importance recalculation
 * - Memory cleanup
 */

import { supabase } from '../services/supabase.js'
import { getSemanticMemoryService } from './semantic-memory.service.js'
import { getSessionSummaryService } from './summary.service.js'
import { getImportanceScoringService } from './importance.service.js'

// ============================================================
// TYPES
// ============================================================

export interface ProcessingJob {
  id: string
  type: 'embedding' | 'summary' | 'cleanup' | 'importance'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  priority: number
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  error?: string
  metadata: Record<string, unknown>
}

export interface ProcessingOptions {
  batchSize: number
  maxRetries: number
  retryDelay: number
  concurrentJobs: number
}

export interface ProcessorStats {
  jobsProcessed: number
  jobsFailed: number
  avgProcessingTime: number
  queueSize: number
  byType: Record<string, { processed: number; failed: number }>
}

// ============================================================
// CONSTANTS
// ============================================================

const DEFAULT_OPTIONS: ProcessingOptions = {
  batchSize: 50,
  maxRetries: 3,
  retryDelay: 5000, // 5 seconds
  concurrentJobs: 3
}

const JOB_PRIORITY = {
  embedding: 1,     // High: user-facing
  importance: 2,    // Medium: improves quality
  summary: 3,       // Low: periodic
  cleanup: 4        // Lowest: maintenance
}

// ============================================================
// ASYNC PROCESSOR SERVICE
// ============================================================

export class AsyncProcessorService {
  private semanticMemory = getSemanticMemoryService()
  private summaryService = getSessionSummaryService()
  private importanceScoring = getImportanceScoringService()

  private options: ProcessingOptions = DEFAULT_OPTIONS
  private jobQueue: Map<string, ProcessingJob> = new Map()
  private processing = new Set<string>()
  private stats: ProcessorStats = {
    jobsProcessed: 0,
    jobsFailed: 0,
    avgProcessingTime: 0,
    queueSize: 0,
    byType: {}
  }

  /**
   * Configure the processor
   */
  configure(options: Partial<ProcessingOptions>): void {
    this.options = { ...this.options, ...options }
  }

  // ============================================================
  // JOB MANAGEMENT
  // ============================================================

  /**
   * Queue a processing job
   */
  queueJob(
    type: ProcessingJob['type'],
    metadata: Record<string, unknown> = {}
  ): string {
    const jobId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const job: ProcessingJob = {
      id: jobId,
      type,
      status: 'pending',
      priority: JOB_PRIORITY[type],
      createdAt: new Date(),
      metadata
    }

    this.jobQueue.set(jobId, job)
    this.updateStats()

    console.log(`[AsyncProcessor] Job queued: ${jobId} (${type})`)

    // Try to process immediately if we have capacity
    this.tryProcessNext()

    return jobId
  }

  /**
   * Queue embedding generation for a message
   */
  queueEmbedding(messageId: string, content: string, importance: number): string {
    return this.queueJob('embedding', {
      messageId,
      content,
      importance
    })
  }

  /**
   * Queue summary generation for a session
   */
  queueSummary(sessionId: string, userId: string): string {
    return this.queueJob('summary', {
      sessionId,
      userId
    })
  }

  /**
   * Queue importance recalculation for a message
   */
  queueImportanceRecalculation(messageId: string): string {
    return this.queueJob('importance', {
      messageId
    })
  }

  /**
   * Get job status
   */
  getJob(jobId: string): ProcessingJob | undefined {
    return this.jobQueue.get(jobId)
  }

  /**
   * Get all jobs
   */
  getAllJobs(): ProcessingJob[] {
    return Array.from(this.jobQueue.values()).sort((a, b) => {
      // First by status (pending first), then by priority
      if (a.status !== b.status) {
        return a.status === 'pending' ? -1 : 1
      }
      return a.priority - b.priority
    })
  }

  // ============================================================
  // PROCESSING
  // ============================================================

  /**
   * Try to process the next job in queue
   */
  private async tryProcessNext(): Promise<void> {
    // Check if we have capacity
    if (this.processing.size >= this.options.concurrentJobs) {
      return
    }

    // Get next pending job
    const jobs = this.getAllJobs()
    const nextJob = jobs.find(j => j.status === 'pending')

    if (!nextJob) {
      return
    }

    // Mark as processing
    this.processing.add(nextJob.id)
    nextJob.status = 'processing'
    nextJob.startedAt = new Date()

    console.log(`[AsyncProcessor] Processing job: ${nextJob.id}`)

    try {
      await this.processJob(nextJob)
      nextJob.status = 'completed'
      nextJob.completedAt = new Date()
      this.stats.jobsProcessed++
      this.stats.byType[nextJob.type] = this.stats.byType[nextJob.type] || { processed: 0, failed: 0 }
      this.stats.byType[nextJob.type].processed++
    } catch (error) {
      console.error(`[AsyncProcessor] Job failed: ${nextJob.id}`, error)
      nextJob.status = 'failed'
      nextJob.error = error instanceof Error ? error.message : String(error)
      this.stats.jobsFailed++
      this.stats.byType[nextJob.type] = this.stats.byType[nextJob.type] || { processed: 0, failed: 0 }
      this.stats.byType[nextJob.type].failed++

      // Retry logic
      const retryCount = (nextJob.metadata.retryCount as number) || 0
      if (retryCount < this.options.maxRetries) {
        nextJob.metadata.retryCount = retryCount + 1
        nextJob.status = 'pending'

        setTimeout(() => {
          this.jobQueue.set(nextJob.id, nextJob)
          this.tryProcessNext()
        }, this.options.retryDelay * (retryCount + 1))
      }
    } finally {
      this.processing.delete(nextJob.id)
      this.updateStats()

      // Try to process next
      this.tryProcessNext()
    }
  }

  /**
   * Process a single job
   */
  private async processJob(job: ProcessingJob): Promise<void> {
    const startTime = Date.now()

    switch (job.type) {
      case 'embedding':
        await this.processEmbeddingJob(job)
        break

      case 'summary':
        await this.processSummaryJob(job)
        break

      case 'importance':
        await this.processImportanceJob(job)
        break

      case 'cleanup':
        await this.processCleanupJob(job)
        break

      default:
        throw new Error(`Unknown job type: ${job.type}`)
    }

    // Update average processing time
    const duration = Date.now() - startTime
    const totalProcessed = this.stats.jobsProcessed + 1
    this.stats.avgProcessingTime =
      (this.stats.avgProcessingTime * (totalProcessed - 1) + duration) / totalProcessed

    console.log(`[AsyncProcessor] Job completed: ${job.id} (${duration}ms)`)
  }

  /**
   * Process embedding job
   */
  private async processEmbeddingJob(job: ProcessingJob): Promise<void> {
    const { messageId, content, importance } = job.metadata as {
      messageId: string
      content: string
      importance: number
    }

    if (!messageId || !content) {
      throw new Error('Invalid embedding job metadata')
    }

    const success = await this.semanticMemory.storeMessageWithEmbedding(
      messageId,
      content,
      importance as number
    )

    if (!success) {
      throw new Error('Failed to generate embedding')
    }
  }

  /**
   * Process summary job
   */
  private async processSummaryJob(job: ProcessingJob): Promise<void> {
    const { sessionId, userId } = job.metadata as {
      sessionId: string
      userId: string
    }

    if (!sessionId || !userId) {
      throw new Error('Invalid summary job metadata')
    }

    const summary = await this.summaryService.generateSummary({
      sessionId,
      userId,
      type: 'periodic'
    })

    if (!summary) {
      throw new Error('Failed to generate summary')
    }
  }

  /**
   * Process importance recalculation job
   */
  private async processImportanceJob(job: ProcessingJob): Promise<void> {
    const { messageId } = job.metadata as {
      messageId: string
    }

    if (!messageId) {
      throw new Error('Invalid importance job metadata')
    }

    // Fetch message content
    const { data, error } = await supabase
      .from('chat_messages')
      .select('content, role')
      .eq('id', messageId)
      .single()

    if (error || !data) {
      throw new Error('Failed to fetch message')
    }

    // Recalculate importance
    const result = this.importanceScoring.calculateImportance(data.content, {
      role: data.role
    })

    // Update message
    const { error: updateError } = await supabase
      .from('chat_messages')
      .update({
        importance_score: result.score,
        metadata: { importance_category: result.category }
      })
      .eq('id', messageId)

    if (updateError) {
      throw new Error('Failed to update importance score')
    }
  }

  /**
   * Process cleanup job
   */
  private async processCleanupJob(job: ProcessingJob): Promise<void> {
    const { olderThanDays } = job.metadata as {
      olderThanDays?: number
    }

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - (olderThanDays || 90))

    // Find old messages with low importance
    const { data: oldMessages } = await supabase
      .from('chat_messages')
      .select('id')
      .lt('created_at', cutoffDate.toISOString())
      .lt('importance_score', 0.3)
      .limit(this.options.batchSize)

    if (oldMessages) {
      console.log(`[AsyncProcessor] Cleaning up ${oldMessages.length} old low-importance messages`)

      // In production, we might archive these instead of deleting
      // For now, we'll just log them
    }
  }

  // ============================================================
  // BATCH PROCESSING
  // ============================================================

  /**
   * Process all unembedded messages
   */
  async processUnembeddedMessages(): Promise<number> {
    const processed = await this.semanticMemory.processUnembeddedMessages(
      this.options.batchSize
    )

    console.log(`[AsyncProcessor] Batch processed ${processed} embeddings`)
    return processed
  }

  /**
   * Process pending summaries for all active sessions
   */
  async processPendingSummaries(userId?: string): Promise<number> {
    let processed = 0

    // Find sessions that need summarization
    let query = supabase
      .from('chat_sessions')
      .select('id, user_id, message_count, last_summary_at')

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data: sessions } = await query

    if (sessions) {
      for (const session of sessions) {
        const needs = await this.summaryService.needsSummarization(
          session.id,
          session.user_id
        )

        if (needs) {
          const summary = await this.summaryService.generateSummary({
            sessionId: session.id,
            userId: session.user_id,
            type: 'periodic'
          })

          if (summary) processed++
        }
      }
    }

    console.log(`[AsyncProcessor] Batch processed ${processed} summaries`)
    return processed
  }

  // ============================================================
  // STATS & MONITORING
  // ============================================================

  /**
   * Get processor statistics
   */
  getStats(): ProcessorStats {
    return { ...this.stats }
  }

  /**
   * Get queue information
   */
  getQueueInfo(): {
    size: number
    byStatus: Record<string, number>
    byType: Record<string, number>
  } {
    const jobs = this.getAllJobs()

    const byStatus: Record<string, number> = {}
    const byType: Record<string, number> = {}

    for (const job of jobs) {
      byStatus[job.status] = (byStatus[job.status] || 0) + 1
      byType[job.type] = (byType[job.type] || 0) + 1
    }

    return {
      size: jobs.length,
      byStatus,
      byType
    }
  }

  /**
   * Update statistics
   */
  private updateStats(): void {
    this.stats.queueSize = this.jobQueue.size
  }

  /**
   * Clear completed jobs
   */
  clearCompleted(): void {
    for (const [id, job] of this.jobQueue.entries()) {
      if (job.status === 'completed' || job.status === 'failed') {
        // Only remove if completed more than 1 hour ago
        const completedAt = job.completedAt || job.startedAt || job.createdAt
        const age = Date.now() - completedAt.getTime()

        if (age > 3600000) { // 1 hour
          this.jobQueue.delete(id)
        }
      }
    }

    this.updateStats()
  }
}

// ============================================================
// GLOBAL INSTANCE
// ============================================================

let globalInstance: AsyncProcessorService | null = null

export function getAsyncProcessorService(): AsyncProcessorService {
  if (!globalInstance) {
    globalInstance = new AsyncProcessorService()

    // Start periodic cleanup
    setInterval(() => {
      globalInstance?.clearCompleted()
    }, 300000) // Every 5 minutes
  }
  return globalInstance
}

export function resetAsyncProcessorService(): void {
  globalInstance = null
}
