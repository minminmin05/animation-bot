/**
 * Knowledge Handler
 *
 * Handles SEARCH_KNOWLEDGE action
 * Uses RAG service for knowledge base queries
 */

import {
  BaseHandler,
  HandlerContext,
  HandlerResult,
  Action
} from '../core/handlers/handler.interface.js'
import { ErrorService } from '../core/errors/index.js'
import { searchRagDocuments } from '../rag/services/rag.service.js'

interface KnowledgeResult {
  query: string
  answer: string
  sources: Array<{
    type: string
    content: string
    confidence?: number
  }>
  found: boolean
}

export class KnowledgeHandler extends BaseHandler {
  readonly action = Action.SEARCH_KNOWLEDGE
  readonly requiredEntities: string[] = []

  canHandle(context: HandlerContext): boolean {
    return context.action === this.action
  }

  validate(context: HandlerContext): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!context.normalizedQuery || context.normalizedQuery.trim().length === 0) {
      errors.push('Query cannot be empty')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  async execute(context: HandlerContext): Promise<HandlerResult> {
    const startTime = Date.now()

    try {
      console.log(`[KnowledgeHandler] Searching RAG for: "${context.normalizedQuery}"`)

      // Use RAG service to search
      const ragResult = await searchRagDocuments({
        query: context.normalizedQuery,
        userId: context.userId,
        userRole: context.userRole
      })

      const knowledgeResult: KnowledgeResult = {
        query: context.normalizedQuery,
        answer: ragResult.answer || '',
        sources: ragResult.sources || [],
        found: ragResult.found || false
      }

      console.log(`[KnowledgeHandler] RAG search ${ragResult.found ? 'found' : 'not found'} results`)

      return this.success(knowledgeResult, {
        executionTime: Date.now() - startTime,
        dataSource: 'rag'
      })

    } catch (error) {
      // If RAG fails, try to provide a helpful fallback
      const errorMessage = error instanceof Error ? error.message : String(error)

      console.error('[KnowledgeHandler] RAG search failed:', errorMessage)

      // Return a graceful failure with helpful message
      return this.failure(
        ErrorService.notFound(
          'Knowledge',
          'Could not find information in the knowledge base'
        )
      )
    }
  }

  /**
   * Create a fallback response when RAG fails
   */
  private createFallbackResponse(query: string): KnowledgeResult {
    return {
      query,
      answer: this.getFallbackMessage(query),
      sources: [],
      found: false
    }
  }

  /**
   * Get a helpful fallback message
   */
  private getFallbackMessage(query: string): string {
    const q = query.toLowerCase()

    // Check for common school topics
    if (q.includes('uniform') || q.includes('dress code') || q.includes('เครื่องแบบ')) {
      return 'ขออภัย ไม่พบข้อมูลเกี่ยวกับเครื่องแบบนักเรียน กรุณาติดต่อฝ่ายวิชาการหรือตรวจสอบจากหนังสือบัญชีโรงเรียน'
    }

    if (q.includes('grade') || q.includes('gpa') || q.includes('เกรด')) {
      return 'ขออภัย ไม่พบข้อมูลเกี่ยวกับเกรด หากคุณต้องการดูเกรดของตัวเอง กรุณาถามในรูปแบบ "เกรดของฉัน" หรือ "ขอดูเกรดของฉันหน่อย"'
    }

    // Generic fallback
    return 'ขออภัย ไม่พบข้อมูลที่คุณค้นหา คุณสามารถลองใช้คำที่ต่างออกไป หรือติดต่อเจ้าหน้าที่ได้'
  }
}
