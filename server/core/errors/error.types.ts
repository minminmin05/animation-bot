/**
 * Standardized Error Types for the School Management AI Assistant
 *
 * Categories and Codes provide:
 * - Consistent error handling across all services
 * - User-safe error messages
 * - Internal detailed logging
 * - Retry logic support
 */

/**
 * Error categories determine severity and retry behavior
 */
export enum ErrorCategory {
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
  DATABASE = 'DATABASE',
  RATE_LIMIT = 'RATE_LIMIT',
  INTERNAL = 'INTERNAL'
}

/**
 * Numeric error codes for programmatic handling
 * Ranges:
 *   1000-1099: Authentication errors
 *   2000-2099: Validation errors
 *   3000-3099: Not found errors
 *   4000-4099: External service errors (LLM, TTS, etc.)
 *   5000-5099: Database errors
 *   9000-9999: Internal errors
 */
export enum ErrorCode {
  // Authentication errors (1000-1099)
  INVALID_TOKEN = 1001,
  EXPIRED_TOKEN = 1002,
  MISSING_TOKEN = 1003,
  TOKEN_VERIFICATION_FAILED = 1004,

  // Authorization errors (1100-1199)
  INSUFFICIENT_PERMISSIONS = 1101,
  ACCESS_DENIED = 1102,
  ROLE_NOT_FOUND = 1103,

  // Validation errors (2000-2099)
  MISSING_REQUIRED_FIELD = 2001,
  INVALID_ENTITY_TYPE = 2002,
  INVALID_QUERY_FORMAT = 2003,
  QUERY_TOO_LONG = 2004,
  INVALID_INPUT_FORMAT = 2005,
  ENTITY_VALIDATION_FAILED = 2006,

  // Not found errors (3000-3099)
  STUDENT_NOT_FOUND = 3001,
  TEACHER_NOT_FOUND = 3002,
  CLASS_NOT_FOUND = 3003,
  SUBJECT_NOT_FOUND = 3004,
  GRADE_NOT_FOUND = 3005,
  USER_NOT_FOUND = 3006,
  HANDLER_NOT_FOUND = 3007,
  RESOURCE_NOT_FOUND = 3099,

  // External service errors (4000-4099)
  LLM_PROVIDER_ERROR = 4001,
  LLM_PROVIDER_UNAVAILABLE = 4002,
  LLM_INVALID_API_KEY = 4003,
  LLM_RATE_LIMIT = 4004,
  LLM_QUOTA_EXCEEDED = 4005,
  LLM_TIMEOUT = 4006,
  TTS_PROVIDER_ERROR = 4007,
  TTS_PROVIDER_UNAVAILABLE = 4008,
  TTS_RATE_LIMIT = 4009,
  EMBEDDING_SERVICE_ERROR = 4010,
  RAG_SERVICE_ERROR = 4011,

  // Database errors (5000-5099)
  QUERY_EXECUTION_FAILED = 5001,
  CONNECTION_FAILED = 5002,
  CONSTRAINT_VIOLATION = 5003,
  DUPLICATE_RECORD = 5004,
  TRANSACTION_FAILED = 5005,

  // Rate limit errors (6000-6099)
  RATE_LIMIT_EXCEEDED = 6001,
  TOO_MANY_REQUESTS = 6002,

  // Internal errors (9000-9999)
  PIPELINE_ERROR = 9001,
  HANDLER_EXECUTION_FAILED = 9002,
  FALLBACK_FAILED = 9003,
  INTERNAL_ERROR = 9999
}

/**
 * Severity levels for logging
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Standard application error with user-safe and internal details
 */
export class AppError extends Error {
  readonly name = 'AppError'

  constructor(
    public readonly code: ErrorCode,
    public readonly category: ErrorCategory,
    message: string,
    public readonly userMessage: string,
    public readonly internalDetails?: string,
    public readonly statusCode: number = 500,
    public readonly isRetryable: boolean = false,
    public readonly severity: ErrorSeverity = ErrorSeverity.MEDIUM
  ) {
    super(message)
    Error.captureStackTrace(this, this.constructor)
  }

  /**
   * Check if this error is retryable
   */
  canRetry(): boolean {
    return this.isRetryable
  }

  /**
   * Get log-friendly representation
   */
  toLog(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      category: this.category,
      message: this.message,
      userMessage: this.userMessage,
      internalDetails: this.internalDetails,
      statusCode: this.statusCode,
      severity: this.severity,
      isRetryable: this.isRetryable
    }
  }
}

/**
 * Validation error for invalid input
 */
export class ValidationError extends AppError {
  constructor(message: string, userMessage?: string, field?: string) {
    super(
      ErrorCode.INVALID_INPUT_FORMAT,
      ErrorCategory.VALIDATION,
      message,
      userMessage || message,
      field ? `Field: ${field}` : undefined,
      400,
      false,
      ErrorSeverity.LOW
    )
    this.name = 'ValidationError'
  }
}

/**
 * Authentication error for auth failures
 */
export class AuthenticationError extends AppError {
  constructor(message: string, userMessage?: string) {
    super(
      ErrorCode.INVALID_TOKEN,
      ErrorCategory.AUTHENTICATION,
      message,
      userMessage || 'Authentication required',
      undefined,
      401,
      false,
      ErrorSeverity.MEDIUM
    )
    this.name = 'AuthenticationError'
  }
}

/**
 * Authorization error for permission failures
 */
export class AuthorizationError extends AppError {
  constructor(message: string, userMessage?: string) {
    super(
      ErrorCode.INSUFFICIENT_PERMISSIONS,
      ErrorCategory.AUTHORIZATION,
      message,
      userMessage || 'You do not have permission to perform this action',
      undefined,
      403,
      false,
      ErrorSeverity.MEDIUM
    )
    this.name = 'AuthorizationError'
  }
}

/**
 * Not found error for missing resources
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`

    super(
      ErrorCode.RESOURCE_NOT_FOUND,
      ErrorCategory.NOT_FOUND,
      message,
      `${resource} not found`,
      identifier,
      404,
      false,
      ErrorSeverity.LOW
    )
    this.name = 'NotFoundError'
  }
}

/**
 * External service error (LLM, TTS, etc.)
 */
export class ExternalServiceError extends AppError {
  constructor(
    service: string,
    message: string,
    userMessage?: string,
    isRetryable: boolean = true
  ) {
    super(
      ErrorCode.LLM_PROVIDER_ERROR,
      ErrorCategory.EXTERNAL_SERVICE,
      `[${service}] ${message}`,
      userMessage || `External service error: ${service}`,
      undefined,
      503,
      isRetryable,
      ErrorSeverity.HIGH
    )
    this.name = 'ExternalServiceError'
  }
}

/**
 * Database error for DB-related failures
 */
export class DatabaseError extends AppError {
  constructor(message: string, userMessage?: string, isRetryable: boolean = false) {
    super(
      ErrorCode.QUERY_EXECUTION_FAILED,
      ErrorCategory.DATABASE,
      message,
      userMessage || 'Database error occurred',
      undefined,
      500,
      isRetryable,
      ErrorSeverity.HIGH
    )
    this.name = 'DatabaseError'
  }
}

/**
 * API Response interface for errors
 */
export interface ErrorResponse {
  success: false
  error: {
    code: ErrorCode
    category: ErrorCategory
    message: string
    retryable: boolean
  }
}

/**
 * Convert AppError to API response
 */
export function errorToResponse(error: AppError): ErrorResponse {
  return {
    success: false,
    error: {
      code: error.code,
      category: error.category,
      message: error.userMessage,
      retryable: error.isRetryable
    }
  }
}
