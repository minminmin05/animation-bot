/**
 * Error Service - Centralized error creation and handling
 *
 * Provides static methods for creating typed errors
 * and utilities for error handling throughout the application.
 */

import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ExternalServiceError,
  DatabaseError,
  ErrorCode,
  ErrorCategory,
  ErrorSeverity,
  errorToResponse,
  ErrorResponse
} from './error.types.js'

/**
 * Log levels mapped from error severity
 */
enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

/**
 * Error tracking context for structured logging
 */
export interface ErrorContext {
  [key: string]: unknown
}

/**
 * Standardized error service
 */
export class ErrorService {
  /**
   * Create a validation error
   */
  static validationFailed(
    message: string,
    userMessage?: string,
    field?: string
  ): ValidationError {
    return new ValidationError(message, userMessage, field)
  }

  /**
   * Create an authentication error
   */
  static notAuthenticated(
    message?: string,
    userMessage?: string
  ): AuthenticationError {
    return new AuthenticationError(
      message || 'Authentication required',
      userMessage || 'กรุณาเข้าสู่ระบบก่อน'
    )
  }

  /**
   * Create an authorization error
   */
  static insufficientPermissions(
    action?: string,
    resource?: string
  ): AuthorizationError {
    const message = action
      ? `Insufficient permissions for action: ${action}${resource ? ` on ${resource}` : ''}`
      : 'Insufficient permissions'

    const userMessage = action
      ? `คุณไม่มีสิทธิ์${action}${resource ? `สำหรับ ${resource}` : ''}`
      : 'คุณไม่มีสิทธิ์ดำเนินการนี้'

    return new AuthorizationError(message, userMessage)
  }

  /**
   * Create a not found error
   */
  static notFound(
    resource: string,
    identifier?: string
  ): NotFoundError {
    return new NotFoundError(resource, identifier)
  }

  /**
   * Create an external service error
   */
  static externalServiceError(
    service: string,
    message: string,
    userMessage?: string,
    isRetryable: boolean = true
  ): ExternalServiceError {
    return new ExternalServiceError(service, message, userMessage, isRetryable)
  }

  /**
   * Create LLM provider error
   */
  static llmError(
    provider: string,
    message: string,
    isRetryable: boolean = true
  ): ExternalServiceError {
    return new ExternalServiceError(
      `LLM:${provider}`,
      message,
      `AI service temporarily unavailable. Please try again.`,
      isRetryable
    )
  }

  /**
   * Create TTS provider error
   */
  static ttsError(
    provider: string,
    message: string
  ): ExternalServiceError {
    return new ExternalServiceError(
      `TTS:${provider}`,
      message,
      undefined,
      true // TTS errors should be retryable
    )
  }

  /**
   * Create database error
   */
  static databaseError(
    message: string,
    userMessage?: string,
    isRetryable: boolean = false
  ): DatabaseError {
    return new DatabaseError(message, userMessage, isRetryable)
  }

  /**
   * Create internal error
   */
  static internalError(
    message: string,
    userMessage?: string
  ): AppError {
    return new AppError(
      ErrorCode.INTERNAL_ERROR,
      ErrorCategory.INTERNAL,
      message,
      userMessage || 'An internal error occurred. Please try again.',
      undefined,
      500,
      false,
      ErrorSeverity.CRITICAL
    )
  }

  /**
   * Create service unavailable error (for fallback failures)
   */
  static serviceUnavailable(
    message?: string
  ): AppError {
    return new AppError(
      ErrorCode.FALLBACK_FAILED,
      ErrorCategory.EXTERNAL_SERVICE,
      message || 'Service unavailable after fallback attempts',
      'ขออภัย ระบบไม่สามารถตอบสนองได้ในขณะนี้ กรุณาลองใหม่ภายหลัง',
      undefined,
      503,
      true,
      ErrorSeverity.HIGH
    )
  }

  /**
   * Create pipeline error
   */
  static pipelineError(
    stage: string,
    message: string
  ): AppError {
    return new AppError(
      ErrorCode.PIPELINE_ERROR,
      ErrorCategory.INTERNAL,
      `Pipeline error at stage '${stage}': ${message}`,
      'Processing error occurred',
      undefined,
      500,
      false,
      ErrorSeverity.MEDIUM
    )
  }

  /**
   * Wrap unknown errors into AppError
   */
  static fromError(error: unknown, context?: string): AppError {
    if (error instanceof AppError) {
      return error
    }

    if (error instanceof Error) {
      return this.internalError(error.message, context)
    }

    return this.internalError(
      String(error),
      context || 'An unknown error occurred'
    )
  }

  /**
   * Check if an error is retryable
   */
  static isRetryable(error: AppError): boolean {
    return error.isRetryable || error.category === ErrorCategory.EXTERNAL_SERVICE
  }

  /**
   * Convert AppError to API response
   */
  static toResponse(error: AppError): ErrorResponse {
    return errorToResponse(error)
  }

  /**
   * Get log level from error severity
   */
  private static getLogLevel(severity: ErrorSeverity): LogLevel {
    switch (severity) {
      case ErrorSeverity.LOW:
        return LogLevel.INFO
      case ErrorSeverity.MEDIUM:
        return LogLevel.WARN
      case ErrorSeverity.HIGH:
        return LogLevel.ERROR
      case ErrorSeverity.CRITICAL:
        return LogLevel.CRITICAL
      default:
        return LogLevel.ERROR
    }
  }

  /**
   * Log an error with context
   */
  static log(error: AppError, context: string, additionalContext?: ErrorContext): void {
    const level = this.getLogLevel(error.severity)
    const timestamp = new Date().toISOString()

    const logData = {
      timestamp,
      level,
      context,
      ...error.toLog(),
      ...additionalContext
    }

    // Use appropriate log method based on severity
    const logMessage = `[${level}] [${context}] ${error.message}`

    switch (level) {
      case LogLevel.DEBUG:
      case LogLevel.INFO:
        console.log(logMessage, logData)
        break
      case LogLevel.WARN:
        console.warn(logMessage, logData)
        break
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(logMessage, logData)
        break
    }
  }

  /**
   * Log a success/operation for debugging
   */
  static logInfo(context: string, message: string, data?: ErrorContext): void {
    const timestamp = new Date().toISOString()
    const logData = {
      timestamp,
      level: LogLevel.INFO,
      context,
      message,
      ...data
    }
    console.log(`[INFO] [${context}] ${message}`, data || '')
  }

  /**
   * Log a warning
   */
  static logWarning(context: string, message: string, data?: ErrorContext): void {
    const timestamp = new Date().toISOString()
    const logData = {
      timestamp,
      level: LogLevel.WARN,
      context,
      message,
      ...data
    }
    console.warn(`[WARN] [${context}] ${message}`, data || '')
  }
}

/**
 * Safe error handler for async operations
 * Wraps errors in AppError and provides consistent logging
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  context: string,
  fallback?: T
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    const appError = ErrorService.fromError(error, context)
    ErrorService.log(appError, context)

    if (fallback !== undefined) {
      return fallback
    }

    throw appError
  }
}

/**
 * Wrap a handler with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  handler: T,
  context: string
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args)
    } catch (error) {
      const appError = ErrorService.fromError(error, context)
      ErrorService.log(appError, context)
      throw appError
    }
  }) as T
}
