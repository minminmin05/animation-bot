/**
 * Error Code Documentation
 *
 * This file provides documentation for all error codes used in the system.
 * Error codes are organized by category and include both technical and user-facing descriptions.
 */

import { ErrorCode, ErrorCategory } from './error.types.js'

/**
 * Error code documentation for debugging and user messaging
 */
export const ERROR_CODE_DOCUMENTATION: Record<ErrorCode, {
  category: ErrorCategory
  technical: string
  user: {
    en: string
    th: string
  }
  statusCode: number
  retryable: boolean
}> = {
  // Authentication errors (1000-1099)
  [ErrorCode.INVALID_TOKEN]: {
    category: ErrorCategory.AUTHENTICATION,
    technical: 'The provided authentication token is invalid or malformed',
    user: {
      en: 'Invalid authentication token. Please login again.',
      th: 'โทเค็นยืนยันตัวตนไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่'
    },
    statusCode: 401,
    retryable: false
  },
  [ErrorCode.EXPIRED_TOKEN]: {
    category: ErrorCategory.AUTHENTICATION,
    technical: 'The provided authentication token has expired',
    user: {
      en: 'Your session has expired. Please login again.',
      th: 'เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบใหม่'
    },
    statusCode: 401,
    retryable: false
  },
  [ErrorCode.MISSING_TOKEN]: {
    category: ErrorCategory.AUTHENTICATION,
    technical: 'No authentication token was provided',
    user: {
      en: 'Authentication required. Please login.',
      th: 'ต้องมีการยืนยันตัวตน กรุณาเข้าสู่ระบบ'
    },
    statusCode: 401,
    retryable: false
  },
  [ErrorCode.TOKEN_VERIFICATION_FAILED]: {
    category: ErrorCategory.AUTHENTICATION,
    technical: 'Failed to verify the authentication token',
    user: {
      en: 'Could not verify your credentials. Please login again.',
      th: 'ไม่สามารถยืนยันตัวตนได้ กรุณาเข้าสู่ระบบใหม่'
    },
    statusCode: 401,
    retryable: false
  },

  // Authorization errors (1100-1199)
  [ErrorCode.INSUFFICIENT_PERMISSIONS]: {
    category: ErrorCategory.AUTHORIZATION,
    technical: 'User does not have sufficient permissions for this action',
    user: {
      en: 'You do not have permission to perform this action.',
      th: 'คุณไม่มีสิทธิ์ดำเนินการนี้'
    },
    statusCode: 403,
    retryable: false
  },
  [ErrorCode.ACCESS_DENIED]: {
    category: ErrorCategory.AUTHORIZATION,
    technical: 'Access to this resource is denied',
    user: {
      en: 'Access denied. You cannot view this resource.',
      th: 'การเข้าถึงถูกปฏิเสธ คุณไม่สามารถดูข้อมูลนี้ได้'
    },
    statusCode: 403,
    retryable: false
  },
  [ErrorCode.ROLE_NOT_FOUND]: {
    category: ErrorCategory.AUTHORIZATION,
    technical: 'The specified role does not exist',
    user: {
      en: 'Invalid user role.',
      th: 'บทบาทผู้ใช้ไม่ถูกต้อง'
    },
    statusCode: 403,
    retryable: false
  },

  // Validation errors (2000-2099)
  [ErrorCode.MISSING_REQUIRED_FIELD]: {
    category: ErrorCategory.VALIDATION,
    technical: 'A required field is missing from the request',
    user: {
      en: 'Required information is missing.',
      th: 'ข้อมูลที่จำเป็นถูกต้องมีไม่ครบ'
    },
    statusCode: 400,
    retryable: false
  },
  [ErrorCode.INVALID_ENTITY_TYPE]: {
    category: ErrorCategory.VALIDATION,
    technical: 'The entity type provided is invalid',
    user: {
      en: 'Invalid data type.',
      th: 'ประเภทข้อมูลไม่ถูกต้อง'
    },
    statusCode: 400,
    retryable: false
  },
  [ErrorCode.INVALID_QUERY_FORMAT]: {
    category: ErrorCategory.VALIDATION,
    technical: 'The query format is invalid',
    user: {
      en: 'Invalid question format.',
      th: 'รูปแบบคำถามไม่ถูกต้อง'
    },
    statusCode: 400,
    retryable: false
  },
  [ErrorCode.QUERY_TOO_LONG]: {
    category: ErrorCategory.VALIDATION,
    technical: 'The query exceeds maximum length',
    user: {
      en: 'Question is too long.',
      th: 'คำถามยาวเกินไป'
    },
    statusCode: 400,
    retryable: false
  },
  [ErrorCode.INVALID_INPUT_FORMAT]: {
    category: ErrorCategory.VALIDATION,
    technical: 'The input format is invalid',
    user: {
      en: 'Invalid input format.',
      th: 'รูปแบบข้อมูลที่ป้อนไม่ถูกต้อง'
    },
    statusCode: 400,
    retryable: false
  },
  [ErrorCode.ENTITY_VALIDATION_FAILED]: {
    category: ErrorCategory.VALIDATION,
    technical: 'Entity validation failed',
    user: {
      en: 'Could not process the request.',
      th: 'ไม่สามารถประมวลผลคำขอได้'
    },
    statusCode: 400,
    retryable: false
  },

  // Not found errors (3000-3099)
  [ErrorCode.STUDENT_NOT_FOUND]: {
    category: ErrorCategory.NOT_FOUND,
    technical: 'The specified student was not found',
    user: {
      en: 'Student not found.',
      th: 'ไม่พบนักเรียน'
    },
    statusCode: 404,
    retryable: false
  },
  [ErrorCode.TEACHER_NOT_FOUND]: {
    category: ErrorCategory.NOT_FOUND,
    technical: 'The specified teacher was not found',
    user: {
      en: 'Teacher not found.',
      th: 'ไม่พบครู'
    },
    statusCode: 404,
    retryable: false
  },
  [ErrorCode.CLASS_NOT_FOUND]: {
    category: ErrorCategory.NOT_FOUND,
    technical: 'The specified class was not found',
    user: {
      en: 'Class not found.',
      th: 'ไม่พบห้องเรียน'
    },
    statusCode: 404,
    retryable: false
  },
  [ErrorCode.SUBJECT_NOT_FOUND]: {
    category: ErrorCategory.NOT_FOUND,
    technical: 'The specified subject was not found',
    user: {
      en: 'Subject not found.',
      th: 'ไม่พบวิชาเรียน'
    },
    statusCode: 404,
    retryable: false
  },
  [ErrorCode.GRADE_NOT_FOUND]: {
    category: ErrorCategory.NOT_FOUND,
    technical: 'The specified grade record was not found',
    user: {
      en: 'Grade record not found.',
      th: 'ไม่พบบันทึกเกรด'
    },
    statusCode: 404,
    retryable: false
  },
  [ErrorCode.USER_NOT_FOUND]: {
    category: ErrorCategory.NOT_FOUND,
    technical: 'The specified user was not found',
    user: {
      en: 'User not found.',
      th: 'ไม่พบผู้ใช้'
    },
    statusCode: 404,
    retryable: false
  },
  [ErrorCode.HANDLER_NOT_FOUND]: {
    category: ErrorCategory.NOT_FOUND,
    technical: 'No handler found for the specified action',
    user: {
      en: 'Cannot process this type of request.',
      th: 'ไม่สามารถประมวลผลประเภทคำขอนี้ได้'
    },
    statusCode: 404,
    retryable: false
  },
  [ErrorCode.RESOURCE_NOT_FOUND]: {
    category: ErrorCategory.NOT_FOUND,
    technical: 'The requested resource was not found',
    user: {
      en: 'Resource not found.',
      th: 'ไม่พบทรัพยากร'
    },
    statusCode: 404,
    retryable: false
  },

  // External service errors (4000-4099)
  [ErrorCode.LLM_PROVIDER_ERROR]: {
    category: ErrorCategory.EXTERNAL_SERVICE,
    technical: 'LLM provider returned an error',
    user: {
      en: 'AI service error. Please try again.',
      th: 'บริการ AI มีข้อผิดพลาด กรุณาลองใหม่'
    },
    statusCode: 503,
    retryable: true
  },
  [ErrorCode.LLM_PROVIDER_UNAVAILABLE]: {
    category: ErrorCategory.EXTERNAL_SERVICE,
    technical: 'LLM provider is unavailable',
    user: {
      en: 'AI service temporarily unavailable.',
      th: 'บริการ AI ไม่สามารถใช้งานได้ชั่วคราว'
    },
    statusCode: 503,
    retryable: true
  },
  [ErrorCode.LLM_INVALID_API_KEY]: {
    category: ErrorCategory.EXTERNAL_SERVICE,
    technical: 'LLM provider rejected the API key',
    user: {
      en: 'AI service configuration error.',
      th: 'การกำหนดค่าบริการ AI ไม่ถูกต้อง'
    },
    statusCode: 503,
    retryable: false
  },
  [ErrorCode.LLM_RATE_LIMIT]: {
    category: ErrorCategory.EXTERNAL_SERVICE,
    technical: 'LLM provider rate limit exceeded',
    user: {
      en: 'AI service is busy. Please try again later.',
      th: 'บริการ AI กำลังไม่วิงงานอยู่ กรุณาลองใหม่ภายหลัง'
    },
    statusCode: 429,
    retryable: true
  },
  [ErrorCode.LLM_QUOTA_EXCEEDED]: {
    category: ErrorCategory.EXTERNAL_SERVICE,
    technical: 'LLM provider quota exceeded',
    user: {
      en: 'AI service quota exceeded.',
      th: 'เกินโควต้าการใช้งานบริการ AI'
    },
    statusCode: 429,
    retryable: false
  },
  [ErrorCode.LLM_TIMEOUT]: {
    category: ErrorCategory.EXTERNAL_SERVICE,
    technical: 'LLM provider request timed out',
    user: {
      en: 'AI service took too long to respond.',
      th: 'บริการ AI ใช้เวลาตอบสนองนานเกินไป'
    },
    statusCode: 504,
    retryable: true
  },
  [ErrorCode.TTS_PROVIDER_ERROR]: {
    category: ErrorCategory.EXTERNAL_SERVICE,
    technical: 'TTS provider returned an error',
    user: {
      en: 'Voice service error.',
      th: 'บริการเสียงพูดมีข้อผิดพลาด'
    },
    statusCode: 503,
    retryable: true
  },
  [ErrorCode.TTS_PROVIDER_UNAVAILABLE]: {
    category: ErrorCategory.EXTERNAL_SERVICE,
    technical: 'TTS provider is unavailable',
    user: {
      en: 'Voice service temporarily unavailable.',
      th: 'บริการเสียงพูดไม่สามารถใช้งานได้ชั่วคราว'
    },
    statusCode: 503,
    retryable: true
  },
  [ErrorCode.TTS_RATE_LIMIT]: {
    category: ErrorCategory.EXTERNAL_SERVICE,
    technical: 'TTS provider rate limit exceeded',
    user: {
      en: 'Voice service is busy.',
      th: 'บริการเสียงพูดกำลังไม่วิงงานอยู่'
    },
    statusCode: 429,
    retryable: true
  },
  [ErrorCode.EMBEDDING_SERVICE_ERROR]: {
    category: ErrorCategory.EXTERNAL_SERVICE,
    technical: 'Embedding service returned an error',
    user: {
      en: 'Knowledge search service error.',
      th: 'บริการค้นหาความรู้มีข้อผิดพลาด'
    },
    statusCode: 503,
    retryable: true
  },
  [ErrorCode.RAG_SERVICE_ERROR]: {
    category: ErrorCategory.EXTERNAL_SERVICE,
    technical: 'RAG service returned an error',
    user: {
      en: 'Knowledge search error.',
      th: 'การค้นหาความรู้มีข้อผิดพลาด'
    },
    statusCode: 503,
    retryable: true
  },

  // Database errors (5000-5099)
  [ErrorCode.QUERY_EXECUTION_FAILED]: {
    category: ErrorCategory.DATABASE,
    technical: 'Database query execution failed',
    user: {
      en: 'Database error occurred.',
      th: 'เกิดข้อผิดพลาดฐานข้อมูล'
    },
    statusCode: 500,
    retryable: false
  },
  [ErrorCode.CONNECTION_FAILED]: {
    category: ErrorCategory.DATABASE,
    technical: 'Database connection failed',
    user: {
      en: 'Cannot connect to database.',
      th: 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้'
    },
    statusCode: 503,
    retryable: true
  },
  [ErrorCode.CONSTRAINT_VIOLATION]: {
    category: ErrorCategory.DATABASE,
    technical: 'Database constraint violation',
    user: {
      en: 'Data constraint violation.',
      th: 'ข้อมูลไม่ตรงตามเงื่อนไขที่กำหนด'
    },
    statusCode: 400,
    retryable: false
  },
  [ErrorCode.DUPLICATE_RECORD]: {
    category: ErrorCategory.DATABASE,
    technical: 'Duplicate record detected',
    user: {
      en: 'This record already exists.',
      th: 'บันทึกนี้มีอยู่แล้ว'
    },
    statusCode: 409,
    retryable: false
  },
  [ErrorCode.TRANSACTION_FAILED]: {
    category: ErrorCategory.DATABASE,
    technical: 'Database transaction failed',
    user: {
      en: 'Transaction failed.',
      th: 'ธุรกรรมล้มเหลว'
    },
    statusCode: 500,
    retryable: true
  },

  // Rate limit errors (6000-6099)
  [ErrorCode.RATE_LIMIT_EXCEEDED]: {
    category: ErrorCategory.RATE_LIMIT,
    technical: 'Rate limit exceeded',
    user: {
      en: 'Too many requests. Please slow down.',
      th: 'ส่งคำขอมากเกินไป กรุณารอสักครู่'
    },
    statusCode: 429,
    retryable: true
  },
  [ErrorCode.TOO_MANY_REQUESTS]: {
    category: ErrorCategory.RATE_LIMIT,
    technical: 'Too many requests in a short time',
    user: {
      en: 'Please wait before making more requests.',
      th: 'กรุณารอสักครู่ก่อนส่งคำขอเพิ่ม'
    },
    statusCode: 429,
    retryable: true
  },

  // Internal errors (9000-9999)
  [ErrorCode.PIPELINE_ERROR]: {
    category: ErrorCategory.INTERNAL,
    technical: 'Pipeline processing error',
    user: {
      en: 'Processing error occurred.',
      th: 'เกิดข้อผิดพลาดในการประมวลผล'
    },
    statusCode: 500,
    retryable: false
  },
  [ErrorCode.HANDLER_EXECUTION_FAILED]: {
    category: ErrorCategory.INTERNAL,
    technical: 'Handler execution failed',
    user: {
      en: 'Failed to process request.',
      th: 'ประมวลผลคำขอไม่สำเร็จ'
    },
    statusCode: 500,
    retryable: false
  },
  [ErrorCode.FALLBACK_FAILED]: {
    category: ErrorCategory.INTERNAL,
    technical: 'All fallback mechanisms failed',
    user: {
      en: 'Service temporarily unavailable.',
      th: 'บริการไม่สามารถใช้งานได้ชั่วคราว'
    },
    statusCode: 503,
    retryable: true
  },
  [ErrorCode.INTERNAL_ERROR]: {
    category: ErrorCategory.INTERNAL,
    technical: 'Internal server error',
    user: {
      en: 'An unexpected error occurred.',
      th: 'เกิดข้อผิดพลาดที่ไม่คาดคิด'
    },
    statusCode: 500,
    retryable: false
  }
}

/**
 * Get user-friendly error message in specified language
 */
export function getUserErrorMessage(
  code: ErrorCode,
  language: 'en' | 'th' = 'en'
): string {
  return ERROR_CODE_DOCUMENTATION[code]?.user[language] || 'Unknown error'
}

/**
 * Get HTTP status code for error code
 */
export function getStatusCode(code: ErrorCode): number {
  return ERROR_CODE_DOCUMENTATION[code]?.statusCode || 500
}
