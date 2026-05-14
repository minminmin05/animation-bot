/**
 * Knowledge Handler
 *
 * Handles RAG knowledge base searches.
 */

import {
  BaseHandler,
  HandlerContext,
  HandlerResult,
  Action
} from '../handler.interface.js'
import { Permission } from '../handler.interface.js'
import { ErrorService } from '../../errors/index.js'

/**
 * Knowledge handler for RAG searches
 */
export class KnowledgeHandler extends BaseHandler {
  readonly action = Action.SEARCH_KNOWLEDGE
  readonly requiredPermissions: Permission[] = []

  canHandle(context: HandlerContext): boolean {
    return context.action === Action.SEARCH_KNOWLEDGE
  }

  validate(context: HandlerContext): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!context.originalQuery || context.originalQuery.trim().length === 0) {
      errors.push('Query is empty')
    }

    return { valid: errors.length === 0, errors }
  }

  async execute(context: HandlerContext): Promise<HandlerResult> {
    const startTime = Date.now()

    try {
      // Import RAG service
      const { searchByEmbedding } = await import('../../../rag/services/supabase.service.js')

      // Perform RAG search
      const results = await searchByEmbedding(context.originalQuery, 5)

      return {
        success: true,
        data: {
          type: 'knowledge',
          results: results || [],
          query: context.originalQuery
        },
        metadata: {
          executionTime: Date.now() - startTime,
          dataSource: 'rag',
          queryExecuted: 'searchByEmbedding',
          rowsAffected: results?.length || 0
        }
      }

    } catch (error) {
      return {
        success: false,
        error: ErrorService.fromError(error, 'Knowledge search failed')
      }
    }
  }
}
