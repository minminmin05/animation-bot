/**
 * Pipeline Types
 *
 * Defines the types and interfaces for the request processing pipeline
 */

import { Intent, IntentClassification } from './intent.types.js'
import { Action, ActionResolution } from './action.types.js'
import { ExtractedEntities, EntityExtractionResult } from '../entities/entity.types.js'
import { NormalizedQuery } from '../normalization/normalizer.service.js'
import { UserRole } from '../handlers/handler.interface.js'
import { AppError } from '../errors/index.js'

/**
 * Pipeline request
 */
export interface PipelineRequest {
  /** Original query text */
  query: string

  /** User ID from authentication */
  userId?: string

  /** User role */
  userRole?: UserRole

  /** Whether to include TTS in response */
  includeTTS?: boolean

  /** Additional request metadata */
  metadata?: Record<string, unknown>
}

/**
 * Pipeline response
 */
export interface PipelineResponse {
  success: boolean
  text: string
  emotion?: 'neutral' | 'happy' | 'concerned' | 'helpful'
  data?: any
  sources?: Array<{
    type: string
    content: string
    confidence?: number
  }>
  tts?: string | null
  error?: {
    code: number
    message: string
    category: string
  }
  metadata?: {
    intent?: Intent
    action?: Action
    confidence?: number
    executionTime: number
    dataSource?: string
  }
}

/**
 * Pipeline processing context (internal)
 */
export interface PipelineContext {
  /** Original request */
  request: PipelineRequest

  /** Query normalization result */
  normalized: NormalizedQuery

  /** Entity extraction result */
  entities: EntityExtractionResult

  /** Intent classification result */
  intent: IntentClassification

  /** Action resolution result */
  action: ActionResolution

  /** Processing stages completed */
  stages: PipelineStage[]

  /** Current stage being processed */
  currentStage?: PipelineStage

  /** Warnings and info messages */
  warnings: string[]
}

/**
 * Pipeline processing stages
 */
export enum PipelineStage {
  NORMALIZATION = 'normalization',
  ENTITY_EXTRACTION = 'entity_extraction',
  INTENT_CLASSIFICATION = 'intent_classification',
  ACTION_RESOLUTION = 'action_resolution',
  AUTHORIZATION = 'authorization',
  EXECUTION = 'execution',
  RESPONSE_FORMATTING = 'response_formatting',
  TTS_GENERATION = 'tts_generation'
}

/**
 * Fallback options
 */
export interface FallbackOptions {
  /** Whether to use RAG as fallback */
  tryRAG?: boolean

  /** Whether to use LLM as fallback */
  tryLLM?: boolean

  /** Maximum number of fallback attempts */
  maxAttempts?: number
}

/**
 * Pipeline configuration
 */
export interface PipelineConfig {
  /** Timeout for each stage (ms) */
  stageTimeout?: number

  /** Fallback options */
  fallback?: FallbackOptions

  /** Whether to enable detailed logging */
  debug?: boolean
}

/**
 * Default pipeline configuration
 */
export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  stageTimeout: 30000,
  fallback: {
    tryRAG: true,
    tryLLM: true,
    maxAttempts: 3
  },
  debug: true
}

/**
 * Create a clarification response
 */
export function createClarificationResponse(question: string): PipelineResponse {
  return {
    success: true,
    text: question,
    emotion: 'concerned',
    sources: [],
    metadata: {
      executionTime: 0,
      dataSource: 'clarification'
    }
  }
}

/**
 * Create an error response
 */
export function createErrorResponse(error: AppError | Error): PipelineResponse {
  if (error instanceof AppError) {
    return {
      success: false,
      text: error.userMessage,
      emotion: 'concerned',
      error: {
        code: error.code,
        message: error.userMessage,
        category: error.category
      },
      metadata: {
        executionTime: 0
      }
    }
  }

  return {
    success: false,
    text: 'เกิดข้อผิดพลาด กรุณาลองใหม่',
    emotion: 'concerned',
    error: {
      code: 9999,
      message: 'An unexpected error occurred',
      category: 'INTERNAL'
    },
    metadata: {
      executionTime: 0
    }
  }
}
