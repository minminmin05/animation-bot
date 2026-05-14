/**
 * Pipeline Service
 *
 * Main request processing pipeline that orchestrates all stages:
 * 1. Query Normalization
 * 2. Entity Extraction
 * 3. Intent Classification
 * 4. Action Resolution
 * 5. Authorization
 * 6. Execution (Handler)
 * 7. Response Formatting
 * 8. TTS (optional)
 */

import {
  PipelineRequest,
  PipelineResponse,
  PipelineContext,
  PipelineStage,
  PipelineConfig,
  DEFAULT_PIPELINE_CONFIG,
  createClarificationResponse,
  createErrorResponse
} from './pipeline.types.js'
import { Intent, IntentClassification } from './intent.types.js'
import { Action, ActionResolution } from './action.types.js'
import { ExtractedEntities } from '../entities/entity.types.js'
import { getQueryNormalizer, NormalizedQuery } from '../normalization/index.js'
import { getEntityService } from '../entities/index.js'
import { getIntentClassifier } from './intent.service.js'
import { resolveAction } from './action.types.js'
import { getHandlerRegistry, HandlerContext, HandlerResult } from '../handlers/index.js'
import { ErrorService, AppError } from '../errors/index.js'
import { ErrorService as ES } from '../errors/error.service.js'

/**
 * Pipeline service class
 */
export class PipelineService {
  private config: PipelineConfig

  constructor(config?: Partial<PipelineConfig>) {
    this.config = { ...DEFAULT_PIPELINE_CONFIG, ...config }
  }

  /**
   * Process a request through the pipeline
   */
  async process(request: PipelineRequest): Promise<PipelineResponse> {
    const startTime = Date.now()
    const context = this.createContext(request)

    try {
      console.log(`\n${'='.repeat(60)}`)
      console.log(`[Pipeline] Processing: "${request.query.slice(0, 50)}${request.query.length > 50 ? '...' : ''}"`)
      console.log(`[Pipeline] User: ${request.userId || 'anonymous'} (${request.userRole || 'no role'})`)
      console.log(`${'='.repeat(60)}\n`)

      // Stage 1: Query Normalization
      context.stages.push(PipelineStage.NORMALIZATION)
      context.normalized = this.normalizeQuery(context)

      // Stage 2: Entity Extraction
      context.stages.push(PipelineStage.ENTITY_EXTRACTION)
      context.entities = this.extractEntities(context)

      // Stage 3: Intent Classification
      context.stages.push(PipelineStage.INTENT_CLASSIFICATION)
      context.intent = this.classifyIntent(context)

      // Handle AMBIGUOUS intent
      if (context.intent.intent === Intent.AMBIGUOUS) {
        console.log('[Pipeline] Ambiguous intent, asking clarification')
        return createClarificationResponse(context.intent.clarificationQuestion || 'กรุณาระบุข้อมูลเพิ่มเติม')
      }

      // Stage 4: Action Resolution
      context.stages.push(PipelineStage.ACTION_RESOLUTION)
      context.action = this.resolveAction(context)

      // Stage 5: Build Handler Context
      const handlerContext = this.buildHandlerContext(context)

      // Stage 6: Execute Handler (with fallback)
      context.stages.push(PipelineStage.EXECUTION)
      const handlerResult = await this.executeHandler(handlerContext, context)

      // Stage 7: Response Formatting
      context.stages.push(PipelineStage.RESPONSE_FORMATTING)
      const response = this.formatResponse(handlerResult, context, Date.now() - startTime)

      // Stage 8: TTS (optional, never breaks flow)
      if (request.includeTTS) {
        context.stages.push(PipelineStage.TTS_GENERATION)
        response.tts = await this.generateTTS(response.text).catch(e => {
          console.warn('[Pipeline] TTS failed, continuing without:', e)
          return null
        })
      }

      console.log(`\n[Pipeline] ✓ Completed in ${Date.now() - startTime}ms`)
      console.log(`[Pipeline] Response: ${response.success ? 'SUCCESS' : 'FAILED'}`)
      console.log(`${'='.repeat(60)}\n`)

      return response

    } catch (error) {
      console.error('[Pipeline] ✗ Error:', error)
      return createErrorResponse(error as Error)
    }
  }

  /**
   * Create pipeline context
   */
  private createContext(request: PipelineRequest): PipelineContext {
    return {
      request,
      normalized: {} as NormalizedQuery,
      entities: { entities: {}, confidence: {} },
      intent: {} as IntentClassification,
      action: {} as ActionResolution,
      stages: [],
      warnings: []
    }
  }

  /**
   * Stage 1: Normalize query
   */
  private normalizeQuery(context: PipelineContext): NormalizedQuery {
    const normalizer = getQueryNormalizer()
    const normalized = normalizer.normalize(context.request.query)

    console.log(`[Normalization] "${context.request.query}"`)
    console.log(`[Normalization] → "${normalized.normalized}"`)
    console.log(`[Normalization] Language: ${normalized.language}`)
    console.log(`[Normalization] Synonyms: ${normalized.detectedSynonyms.join(', ') || 'none'}\n`)

    return normalized
  }

  /**
   * Stage 2: Extract entities
   */
  private extractEntities(context: PipelineContext) {
    const entityService = getEntityService()
    const result = entityService.extract(context.normalized.normalized)

    const summary = entityService.getSummary(result)

    console.log('[EntityExtraction] Results:')
    if (Object.keys(summary).length === 0) {
      console.log('[EntityExtraction] No entities detected\n')
    } else {
      for (const [type, info] of Object.entries(summary)) {
        console.log(`[EntityExtraction]   ${type}: ${info.count} (confidence: ${info.confidence.toFixed(2)})`)
      }
      console.log('')
    }

    return result
  }

  /**
   * Stage 3: Classify intent
   */
  private classifyIntent(context: PipelineContext): IntentClassification {
    const classifier = getIntentClassifier()
    return classifier.classifyWithNormalization(
      context.normalized.normalized,
      context.entities.entities
    )
  }

  /**
   * Stage 4: Resolve action
   */
  private resolveAction(context: PipelineContext): ActionResolution {
    return resolveAction(
      context.normalized.normalized,
      context.intent.intent,
      context.entities.entities
    )
  }

  /**
   * Build handler context
   */
  private buildHandlerContext(context: PipelineContext): HandlerContext {
    return {
      userId: context.request.userId,
      userRole: context.request.userRole,
      action: context.action.action,
      entities: context.entities.entities,
      originalQuery: context.request.query,
      normalizedQuery: context.normalized.normalized,
      metadata: {
        intent: context.intent.intent,
        confidence: context.intent.confidence,
        reasoning: context.intent.reasoning
      }
    }
  }

  /**
   * Stage 6: Execute handler with fallback
   */
  private async executeHandler(
    context: HandlerContext,
    pipelineContext: PipelineContext
  ): Promise<HandlerResult> {
    const registry = getHandlerRegistry()

    try {
      // Try primary handler
      const result = await registry.execute(context, {
        timeout: this.config.stageTimeout,
        useFallback: true
      })

      if (result.success) {
        return result
      }

      // Primary handler failed, try fallback
      if (result.error) {
        console.warn('[Pipeline] Primary handler failed:', result.error.userMessage)
        return await this.executeFallback(context, pipelineContext)
      }

      return result

    } catch (error) {
      console.error('[Pipeline] Handler execution error:', error)
      return await this.executeFallback(context, pipelineContext)
    }
  }

  /**
   * Execute fallback logic
   */
  private async executeFallback(
    context: HandlerContext,
    pipelineContext: PipelineContext
  ): Promise<HandlerResult> {
    console.log('[Pipeline] Executing fallback...')

    // Fallback 1: Try RAG search
    if (this.config.fallback?.tryRAG && context.action !== 'SEARCH_KNOWLEDGE') {
      try {
        console.log('[Pipeline] Fallback: RAG search')
        const { searchByEmbedding } = await import('../../rag/services/supabase.service.js')
        const ragResults = await searchByEmbedding(context.originalQuery, 3)

        if (ragResults && ragResults.length > 0) {
          console.log('[Pipeline] ✓ RAG fallback succeeded')
          return {
            success: true,
            data: { type: 'knowledge', results: ragResults },
            metadata: {
              executionTime: 0,
              dataSource: 'rag_fallback'
            }
          }
        }
      } catch (e) {
        console.warn('[Pipeline] RAG fallback failed:', e)
      }
    }

    // Fallback 2: Try LLM generation
    if (this.config.fallback?.tryLLM) {
      try {
        console.log('[Pipeline] Fallback: LLM generation')
        const { generateAnswer } = await import('../../rag/services/llm.service.js')

        const llmResult = await generateAnswer(
          context.originalQuery,
          [],
          undefined
        )

        console.log('[Pipeline] ✓ LLM fallback succeeded')
        return {
          success: true,
          data: { type: 'llm_generated', ...llmResult },
          metadata: {
            executionTime: 0,
            dataSource: 'llm_fallback'
          }
        }
      } catch (e) {
        console.warn('[Pipeline] LLM fallback failed:', e)
      }
    }

    // All fallbacks failed
    console.log('[Pipeline] All fallbacks failed')
    return {
      success: false,
      error: ES.serviceUnavailable('Unable to process request after fallback attempts')
    }
  }

  /**
   * Format handler result as pipeline response
   */
  private formatResponse(
    result: HandlerResult,
    context: PipelineContext,
    executionTime: number
  ): PipelineResponse {
    if (result.success && result.data) {
      // Determine emotion based on intent and data
      let emotion: 'neutral' | 'happy' | 'concerned' | 'helpful' = 'helpful'

      if (context.intent.intent === Intent.PERSONAL_DATA) {
        emotion = 'happy' // Positive emotion for personal data
      } else if (context.entities.entities.people?.length > 0) {
        emotion = 'helpful'
      } else if (result.data.type === 'llm_generated') {
        emotion = result.data.emotion || 'neutral'
      }

      // Format text based on data type
      let text = ''
      let sources = []

      switch (result.data.type) {
        case 'knowledge':
        case 'rag_fallback':
          text = this.formatKnowledgeResponse(result.data.results || result.data)
          sources = (result.data.results || []).map((r: any) => ({
            type: 'knowledge',
            content: r.content || r.text,
            confidence: r.similarity || r.score
          }))
          break

        case 'llm_generated':
          text = result.data.text || 'ข้อมูลที่ค้นหา'
          emotion = result.data.emotion || emotion
          break

        case 'grades':
          text = this.formatGradesResponse(result.data)
          break

        case 'attendance':
          text = this.formatAttendanceResponse(result.data)
          break

        case 'schedule':
          text = this.formatScheduleResponse(result.data)
          break

        case 'statistics':
          text = this.formatStatisticsResponse(result.data)
          break

        default:
          text = JSON.stringify(result.data)
      }

      return {
        success: true,
        text,
        emotion,
        data: result.data,
        sources,
        metadata: {
          intent: context.intent.intent,
          action: context.action.action,
          confidence: context.intent.confidence,
          executionTime,
          dataSource: result.metadata?.dataSource || 'database'
        }
      }
    }

    // Error response
    if (result.error) {
      return {
        success: false,
        text: result.error.userMessage,
        emotion: 'concerned',
        error: {
          code: result.error.code,
          message: result.error.userMessage,
          category: result.error.category
        },
        metadata: {
          executionTime,
          dataSource: result.metadata?.dataSource || 'error'
        }
      }
    }

    // Unknown state
    return {
      success: false,
      text: 'ไม่สามารถประมวลผลได้',
      emotion: 'concerned',
      metadata: { executionTime }
    }
  }

  /**
   * Format knowledge/RAG response
   */
  private formatKnowledgeResponse(results: any[]): string {
    if (!results || results.length === 0) {
      return 'ไม่พบข้อมูลที่เกี่ยวข้อง'
    }

    return results
      .map((r, i) => `[${i + 1}] ${r.content || r.text}`)
      .join('\n\n')
  }

  /**
   * Format grades response
   */
  private formatGradesResponse(data: any): string {
    if (!data.grades || data.grades.length === 0) {
      return 'ไม่พบข้อมูลเกรด'
    }

    let text = `ข้อมูลเกรดของ ${data.studentName || 'นักเรียน'}:\n\n`

    for (const grade of data.grades) {
      text += `${grade.subject || grade.subject_name}: ${grade.score || grade.grade}\n`
    }

    if (data.gpa !== undefined) {
      text += `\nเกรดเฉลี่ย: ${data.gpa}`
    }

    return text
  }

  /**
   * Format attendance response
   */
  private formatAttendanceResponse(data: any): string {
    if (!data.records || data.records.length === 0) {
      return 'ไม่พบข้อมูลการมาเรียน'
    }

    let text = `ข้อมูลการมาเรียน:\n\n`

    for (const record of data.records) {
      const status = record.status === 'present' ? 'มาเรียน' :
                    record.status === 'absent' ? 'ขาดเรียน' :
                    record.status === 'late' ? 'มาสาย' : record.status
      text += `${record.date || '-'}: ${status}\n`
    }

    if (data.summary) {
      text += `\nสรุป: ${data.summary}`
    }

    return text
  }

  /**
   * Format schedule response
   */
  private formatScheduleResponse(data: any): string {
    if (!data.schedule || data.schedule.length === 0) {
      return 'ไม่พบตารางเรียน'
    }

    let text = `ตารางเรียน:\n\n`

    for (const item of data.schedule) {
      text += `${item.day || '-'} ${item.time || '-'}: ${item.subject || '-'} (ห้อง ${item.room || '-'})\n`
    }

    return text
  }

  /**
   * Format statistics response
   */
  private formatStatisticsResponse(data: any): string {
    let text = 'สถิติโรงเรียน:\n\n'

    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'number') {
        text += `${key}: ${value}\n`
      }
    }

    return text
  }

  /**
   * Generate TTS (optional)
   */
  private async generateTTS(text: string): Promise<string | null> {
    try {
      const { generateSpeech } = await import('../../api/tts.controller.js')
      const audioBuffer = await generateSpeech({ text })

      // Return base64 encoded audio
      return audioBuffer.toString('base64')
    } catch (error) {
      console.warn('[Pipeline] TTS generation failed:', error)
      return null
    }
  }
}

/**
 * Global pipeline service instance
 */
let globalPipeline: PipelineService | null = null

/**
 * Get or create the global pipeline service
 */
export function getPipelineService(config?: Partial<PipelineConfig>): PipelineService {
  if (!globalPipeline) {
    globalPipeline = new PipelineService(config)
  }
  return globalPipeline
}

/**
 * Convenience function to process a request
 */
export async function processRequest(request: PipelineRequest): Promise<PipelineResponse> {
  return getPipelineService().process(request)
}
