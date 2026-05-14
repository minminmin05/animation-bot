/**
 * Execution Result Types
 *
 * Defines the result types returned by handlers
 */

import { AppError } from '../../errors/index.js'

/**
 * Result source types
 */
export type ResultSource = 'database' | 'rag' | 'llm' | 'cache' | 'fallback'

/**
 * Base handler execution result
 */
export interface HandlerExecutionResult {
  success: boolean
  data?: unknown
  error?: AppError
  metadata: ExecutionMetadata
}

/**
 * Execution metadata
 */
export interface ExecutionMetadata {
  executionTime: number
  dataSource: ResultSource
  queryExecuted?: string
  rowsAffected?: number
  cacheHit?: boolean
  [key: string]: unknown
}

/**
 * Successful result
 */
export class SuccessResult implements HandlerExecutionResult {
  readonly success = true
  readonly data: unknown
  readonly metadata: ExecutionMetadata

  constructor(data: unknown, metadata: Partial<ExecutionMetadata> = {}) {
    this.data = data
    this.metadata = {
      executionTime: 0,
      dataSource: 'database',
      ...metadata
    }
  }
}

/**
 * Failed result
 */
export class FailureResult implements HandlerExecutionResult {
  readonly success = false
  readonly error: AppError
  readonly data?: unknown
  readonly metadata: ExecutionMetadata

  constructor(error: AppError, data?: unknown) {
    this.error = error
    this.data = data
    this.metadata = {
      executionTime: 0,
      dataSource: 'database'
    }
  }
}

/**
 * Create a successful result
 */
export function successResult(
  data: unknown,
  metadata?: Partial<ExecutionMetadata>
): SuccessResult {
  return new SuccessResult(data, metadata)
}

/**
 * Create a failed result
 */
export function failureResult(
  error: AppError,
  data?: unknown
): FailureResult {
  return new FailureResult(error, data)
}

/**
 * Check if result is successful
 */
export function isSuccess(result: HandlerExecutionResult): result is SuccessResult {
  return result.success === true
}

/**
 * Check if result is a failure
 */
export function isFailure(result: HandlerExecutionResult): result is FailureResult {
  return result.success === false
}

/**
 * Get data from result or throw error
 */
export function getDataOrThrow<T>(result: HandlerExecutionResult): T {
  if (isSuccess(result)) {
    return result.data as T
  }
  throw result.error
}
