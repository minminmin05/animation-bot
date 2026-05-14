/**
 * Handler Interfaces
 *
 * Defines the contract for all action handlers in the system.
 * Handlers process specific types of requests (GET_GRADES, GET_SCHEDULE, etc.)
 */

import { AppError } from '../errors/index.js'
import { ExtractedEntities } from '../entities/entity.types.js'

/**
 * User roles
 */
export enum UserRole {
  ADMIN = 'admin',
  OWNER = 'owner',
  TEACHER = 'teacher',
  PARENT = 'parent',
  STUDENT = 'student'
}

/**
 * Permission types
 */
export enum Permission {
  // Student permissions
  READ_OWN_GRADES = 'READ_OWN_GRADES',
  READ_OWN_ATTENDANCE = 'READ_OWN_ATTENDANCE',
  READ_OWN_SCHEDULE = 'READ_OWN_SCHEDULE',
  READ_OWN_PAYMENTS = 'READ_OWN_PAYMENTS',
  READ_OWN_DISCIPLINE = 'READ_OWN_DISCIPLINE',

  // Parent permissions
  READ_OWN_CHILDREN_GRADES = 'READ_OWN_CHILDREN_GRADES',
  READ_OWN_CHILDREN_ATTENDANCE = 'READ_OWN_CHILDREN_ATTENDANCE',
  READ_OWN_CHILDREN_SCHEDULE = 'READ_OWN_CHILDREN_SCHEDULE',

  // Teacher permissions
  READ_CLASS_STUDENTS = 'READ_CLASS_STUDENTS',
  READ_CLASS_GRADES = 'READ_CLASS_GRADES',
  READ_CLASS_ATTENDANCE = 'READ_CLASS_ATTENDANCE',
  WRITE_ATTENDANCE = 'WRITE_ATTENDANCE',
  WRITE_GRADES = 'WRITE_GRADES',

  // Admin permissions
  READ_ALL_STUDENTS = 'READ_ALL_STUDENTS',
  READ_ALL_TEACHERS = 'READ_ALL_TEACHERS',
  WRITE_STUDENTS = 'WRITE_STUDENTS',
  WRITE_TEACHERS = 'WRITE_TEACHERS',
  MANAGE_ACCESS_POLICIES = 'MANAGE_ACCESS_POLICIES',
  MANAGE_SYSTEM_SETTINGS = 'MANAGE_SYSTEM_SETTINGS',

  // General permissions
  READ_GRADES = 'READ_GRADES',
  READ_ATTENDANCE = 'READ_ATTENDANCE',
  READ_SCHEDULE = 'READ_SCHEDULE',
  READ_PAYMENTS = 'READ_PAYMENTS',
  READ_DISCIPLINE = 'READ_DISCIPLINE'
}

/**
 * Actions that handlers can process
 */
export enum Action {
  GET_STUDENT_PROFILE = 'GET_STUDENT_PROFILE',
  GET_SCHEDULE = 'GET_SCHEDULE',
  GET_GRADES = 'GET_GRADES',
  GET_ATTENDANCE = 'GET_ATTENDANCE',
  GET_PAYMENTS = 'GET_PAYMENTS',
  GET_DISCIPLINE = 'GET_DISCIPLINE',
  GET_STUDENT_COUNT = 'GET_STUDENT_COUNT',
  GET_TEACHER_COUNT = 'GET_TEACHER_COUNT',
  GET_CLASS_COUNT = 'GET_CLASS_COUNT',
  GET_STATISTICS = 'GET_STATISTICS',
  SEARCH_KNOWLEDGE = 'SEARCH_KNOWLEDGE'
}

/**
 * Handler execution context
 */
export interface HandlerContext {
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

  /** Additional context data */
  metadata?: Record<string, unknown>
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Handler execution result
 */
export interface HandlerResult {
  success: boolean
  data?: any
  error?: AppError
  metadata?: {
    executionTime: number
    dataSource: 'database' | 'rag' | 'llm' | 'cache'
    queryExecuted?: string
    rowsAffected?: number
  }
}

/**
 * Formatted response for handlers
 */
export interface HandlerResponse {
  success: boolean
  text: string
  emotion?: 'neutral' | 'happy' | 'concerned' | 'helpful'
  data?: any
  tts?: string | null
  sources?: Array<{
    type: string
    content: string
    confidence?: number
  }>
}

/**
 * Action handler interface
 *
 * All handlers must implement this interface
 */
export interface ActionHandler {
  /** The action this handler processes */
  readonly action: Action

  /** Required permissions to use this handler */
  readonly requiredPermissions?: Permission[]

  /** Required entities for this handler to work */
  readonly requiredEntities?: string[]

  /**
   * Check if this handler can handle the given context
   */
  canHandle(context: HandlerContext): boolean

  /**
   * Validate the handler context before execution
   */
  validate(context: HandlerContext): ValidationResult

  /**
   * Execute the handler and return results
   */
  execute(context: HandlerContext): Promise<HandlerResult>
}

/**
 * Base handler with common functionality
 */
export abstract class BaseHandler implements ActionHandler {
  abstract readonly action: Action
  readonly requiredPermissions?: Permission[]
  readonly requiredEntities?: string[] = []

  abstract canHandle(context: HandlerContext): boolean
  abstract validate(context: HandlerContext): ValidationResult
  abstract execute(context: HandlerContext): Promise<HandlerResult>

  /**
   * Get entity value from context
   */
  protected getEntity(context: HandlerContext, entityType: string): string | undefined {
    const entities = context.entities[entityType as keyof ExtractedEntities]
    return Array.isArray(entities) && entities.length > 0 ? entities[0] : undefined
  }

  /**
   * Check if required entities are present
   */
  protected hasRequiredEntities(context: HandlerContext): boolean {
    if (!this.requiredEntities || this.requiredEntities.length === 0) {
      return true
    }

    for (const entity of this.requiredEntities) {
      const values = context.entities[entity as keyof ExtractedEntities]
      if (!Array.isArray(values) || values.length === 0) {
        return false
      }
    }

    return true
  }

  /**
   * Create a successful result
   */
  protected success(data: any, metadata?: Partial<HandlerResult['metadata']>): HandlerResult {
    return {
      success: true,
      data,
      metadata: {
        executionTime: 0,
        dataSource: 'database',
        ...metadata
      }
    }
  }

  /**
   * Create a failed result
   */
  protected failure(error: AppError): HandlerResult {
    return {
      success: false,
      error
    }
  }
}
