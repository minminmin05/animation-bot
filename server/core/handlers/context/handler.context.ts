/**
 * Handler Execution Context
 *
 * Defines the context passed to handlers during execution
 */

import { Action, UserRole, ExtractedEntities } from '../handler.interface.js'

/**
 * Extended handler context with additional metadata
 */
export interface ExtendedHandlerContext {
  /** User ID from authentication */
  userId?: string

  /** User role */
  userRole?: UserRole

  /** Action to execute */
  action: Action

  /** Extracted entities from the query */
  entities: ExtractedEntities

  /** Original query text */
  originalQuery: string

  /** Normalized query text */
  normalizedQuery: string

  /** Request timestamp */
  timestamp: Date

  /** Request ID for tracing */
  requestId: string

  /** Additional metadata */
  metadata: HandlerMetadata
}

/**
 * Handler metadata
 */
export interface HandlerMetadata {
  /** Client information */
  client?: {
    ip?: string
    userAgent?: string
  }

  /** Session information */
  session?: {
    id?: string
    isNew?: boolean
  }

  /** Custom metadata */
  custom?: Record<string, unknown>
}

/**
 * Create a new handler context
 */
export function createHandlerContext(
  params: {
    userId?: string
    userRole?: UserRole
    action: Action
    entities: ExtractedEntities
    originalQuery: string
    normalizedQuery: string
  },
  metadata?: HandlerMetadata
): ExtendedHandlerContext {
  return {
    userId: params.userId,
    userRole: params.userRole,
    action: params.action,
    entities: params.entities,
    originalQuery: params.originalQuery,
    normalizedQuery: params.normalizedQuery,
    timestamp: new Date(),
    requestId = generateRequestId(),
    metadata: metadata || {}
  }
}

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Clone a handler context (for modification)
 */
export function cloneHandlerContext(
  context: ExtendedHandlerContext,
  modifications?: Partial<ExtendedHandlerContext>
): ExtendedHandlerContext {
  return {
    ...context,
    ...modifications,
    metadata: {
      ...context.metadata,
      ...modifications?.metadata
    }
  }
}
