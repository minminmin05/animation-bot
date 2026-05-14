/**
 * Pipeline Service
 *
 * Main orchestrator for processing user queries through the new architecture.
 * Handles: Intent → Action → Handler → Response with fallback hierarchy
 */

import { classifyIntent, Intent } from '../rag/services/intent.service.js'
import { detectDataAction, DataAction } from '../services/action-mapper.service.js'
import { QueryNormalizer } from '../core/normalization/normalizer.service.js'
import { EntityService, ExtractedEntities } from '../core/entities/entity.service.js'
import { HandlerRegistry, HandlerContext, HandlerResult } from '../core/handlers/handler.registry.js'
import { HandlerResponse, UserRole, Action } from '../core/handlers/handler.interface.js'
import { ErrorService } from '../core/errors/index.js'
import { searchRagDocuments } from '../rag/services/rag.service.js'
import { generateAnswer } from '../rag/services/llm.service.js'

// ============================================================
// TYPES
// ============================================================

export interface PipelineRequest {
  query: string
  userId?: string
  userRole?: UserRole
  metadata?: Record<string, unknown>
}

export interface PipelineResponse extends HandlerResponse {
  intent: Intent
  action: DataAction | null
  handlerAction: Action | null
  entities: ExtractedEntities
  normalizedQuery: string
  executionPath: 'handler' | 'rag' | 'llm' | 'error'
  executionTime: number
}

export interface PipelineOptions {
  useFallback?: boolean
  enableLLM?: boolean
  timeout?: number
  debug?: boolean
}

// ============================================================
// PIPELINE SERVICE
// ============================================================

export class PipelineService {
  private registry: HandlerRegistry
  private normalizer: QueryNormalizer
  private entityService: EntityService
  private options: PipelineOptions

  constructor(
    registry: HandlerRegistry,
    options: PipelineOptions = {}
  ) {
    this.registry = registry
    this.normalizer = new QueryNormalizer()
    this.entityService = new EntityService()
    this.options = {
      useFallback: true,
      enableLLM: true,
      timeout: 30000,
      debug: false,
      ...options
    }
  }

  /**
   * Process a user query through the complete pipeline
   */
  async process(request: PipelineRequest): Promise<PipelineResponse> {
    const startTime = Date.now()

    console.log(`\n${'='.repeat(70)}`)
    console.log(`[Pipeline] PROCESSING QUERY: "${request.query}"`)
    console.log(`[Pipeline] User: ${request.userId} (${request.userRole || 'guest'})`)
    console.log(`[Pipeline] ${'='.repeat(70)}`)

    try {
      // Step 1: Normalize query
      const normalizedQuery = this.normalizer.normalize(request.query)
      console.log(`[Pipeline] Normalized: "${normalizedQuery}"`)

      // Step 2: Classify intent
      const intentResult = classifyIntent(request.query, {
        userId: request.userId,
        role: request.userRole
      })
      console.log(`[Pipeline] Intent: ${intentResult.intent} (confidence: ${intentResult.confidence.toFixed(2)})`)

      // Step 3: Extract entities
      const entityResult = this.entityService.extract(request.query)
      const entities = entityResult.entities
      console.log(`[Pipeline] Entities extracted: ${Object.keys(entities).length}`)

      // Step 4: Determine action
      let dataAction: DataAction | null = null
      let handlerAction: Action | null = null

      if (intentResult.intent === Intent.PERSONAL_DATA) {
        const personName = entities.person_name?.[0] || null
        const actionResult = detectDataAction(request.query, personName)
        dataAction = actionResult.action
        console.log(`[Pipeline] Data Action: ${dataAction}`)
      }

      // Map DataAction to Handler Action
      if (dataAction) {
        handlerAction = this.mapDataActionToHandlerAction(dataAction)
      } else if (intentResult.intent === Intent.DATABASE_QUERY) {
        handlerAction = Action.GET_STATISTICS
      } else if (intentResult.intent === Intent.KNOWLEDGE) {
        handlerAction = Action.SEARCH_KNOWLEDGE
      }

      console.log(`[Pipeline] Handler Action: ${handlerAction || 'none'}`)

      // Step 5: Execute handler if available
      if (handlerAction && this.registry.has(handlerAction)) {
        const handlerResult = await this.executeHandler(
          handlerAction,
          normalizedQuery,
          request,
          entities
        )

        if (handlerResult.success) {
          console.log(`[Pipeline] Handler execution successful`)
          return this.formatSuccessResponse({
            intent: intentResult.intent,
            action: dataAction,
            handlerAction,
            entities,
            normalizedQuery,
            executionPath: 'handler',
            executionTime: Date.now() - startTime,
            handlerResult,
            originalQuery: request.query
          })
        }
      }

      // Step 6: Fallback to RAG
      console.log(`[Pipeline] Handler not available or failed, trying RAG`)
      const ragResult = await this.tryRAG(request.query, normalizedQuery, request)

      if (ragResult) {
        console.log(`[Pipeline] RAG execution successful`)
        return ragResult
      }

      // Step 7: Fallback to LLM
      if (this.options.enableLLM) {
        console.log(`[Pipeline] RAG failed, trying LLM`)
        const llmResult = await this.tryLLM(request.query, normalizedQuery, intentResult.intent)
        if (llmResult) {
          console.log(`[Pipeline] LLM execution successful`)
          return llmResult
        }
      }

      // Step 8: No results - return graceful failure
      console.log(`[Pipeline] All fallbacks exhausted`)
      return this.formatErrorResponse({
        intent: intentResult.intent,
        action: dataAction,
        handlerAction,
        entities,
        normalizedQuery,
        executionPath: 'error',
        executionTime: Date.now() - startTime,
        originalQuery: request.query
      })

    } catch (error) {
      console.error(`[Pipeline] Error processing query:`, error)
      return this.formatErrorResponse({
        intent: Intent.UNKNOWN,
        action: null,
        handlerAction: null,
        entities: {},
        normalizedQuery: request.query,
        executionPath: 'error',
        executionTime: Date.now() - startTime,
        originalQuery: request.query,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  /**
   * Execute a handler
   */
  private async executeHandler(
    action: Action,
    normalizedQuery: string,
    request: PipelineRequest,
    entities: ExtractedEntities
  ): Promise<HandlerResult> {
    const context: HandlerContext = {
      userId: request.userId,
      userRole: request.userRole,
      action,
      entities,
      originalQuery: request.query,
      normalizedQuery,
      metadata: request.metadata
    }

    return this.registry.execute(context, {
      useFallback: this.options.useFallback,
      timeout: this.options.timeout
    })
  }

  /**
   * Try RAG as fallback
   */
  private async tryRAG(
    originalQuery: string,
    normalizedQuery: string,
    request: PipelineRequest
  ): Promise<PipelineResponse | null> {
    try {
      const ragResult = await searchRagDocuments({
        query: normalizedQuery,
        userId: request.userId,
        userRole: request.userRole
      })

      if (ragResult.found && ragResult.answer) {
        return {
          success: true,
          text: ragResult.answer,
          emotion: 'helpful',
          sources: ragResult.sources?.map(s => ({
            type: s.type,
            content: s.content,
            confidence: s.confidence
          })),
          intent: Intent.KNOWLEDGE,
          action: null,
          handlerAction: Action.SEARCH_KNOWLEDGE,
          entities: {},
          normalizedQuery,
          executionPath: 'rag',
          executionTime: 0
        }
      }

      return null
    } catch (error) {
      console.error('[Pipeline] RAG fallback failed:', error)
      return null
    }
  }

  /**
   * Try LLM as final fallback
   */
  private async tryLLM(
    originalQuery: string,
    normalizedQuery: string,
    intent: Intent
  ): Promise<PipelineResponse | null> {
    try {
      const llmResult = await generateAnswer(
        normalizedQuery,
        [], // No sources for LLM-only fallback
        undefined // No personal data context
      )

      if (llmResult && llmResult.text && llmResult.text.trim().length > 0) {
        return {
          success: true,
          text: llmResult.text,
          emotion: llmResult.emotion || 'helpful',
          intent: Intent.KNOWLEDGE,
          action: null,
          handlerAction: null,
          entities: {},
          normalizedQuery,
          executionPath: 'llm',
          executionTime: 0
        }
      }

      return null
    } catch (error) {
      console.error('[Pipeline] LLM fallback failed:', error)
      return null
    }
  }

  /**
   * Map DataAction to Handler Action
   */
  private mapDataActionToHandlerAction(dataAction: DataAction): Action {
    switch (dataAction) {
      case 'GET_STUDENT_PROFILE':
        return Action.GET_STUDENT_PROFILE
      case 'GET_GRADES':
        return Action.GET_GRADES
      case 'GET_ATTENDANCE':
        return Action.GET_ATTENDANCE
      case 'GET_SCHEDULE':
        return Action.GET_SCHEDULE
      case 'GET_PAYMENTS':
        return Action.GET_PAYMENTS
      case 'GET_DISCIPLINE':
        return Action.GET_DISCIPLINE
      default:
        return Action.GET_STUDENT_PROFILE
    }
  }

  /**
   * Format success response
   */
  private formatSuccessResponse(config: {
    intent: Intent
    action: DataAction | null
    handlerAction: Action | null
    entities: ExtractedEntities
    normalizedQuery: string
    executionPath: 'handler' | 'rag' | 'llm'
    executionTime: number
    handlerResult: HandlerResult
    originalQuery: string
  }): PipelineResponse {
    const { handlerResult, ...rest } = config

    // Format handler data into readable text
    let text = ''
    let emotion: 'neutral' | 'happy' | 'concerned' | 'helpful' = 'neutral'

    if (rest.executionPath === 'handler' && handlerResult.data) {
      text = this.formatHandlerData(rest.handlerAction!, handlerResult.data)
      emotion = 'helpful'
    }

    return {
      success: true,
      text,
      emotion,
      data: handlerResult.data,
      tts: null,
      sources: [],
      ...rest
    }
  }

  /**
   * Format handler data into readable text
   */
  private formatHandlerData(action: Action, data: any): string {
    switch (action) {
      case Action.GET_STUDENT_PROFILE:
        return this.formatStudentProfile(data)

      case Action.GET_GRADES:
        return this.formatGrades(data)

      case Action.GET_ATTENDANCE:
        return this.formatAttendance(data)

      case Action.GET_SCHEDULE:
        return this.formatSchedule(data)

      case Action.GET_STATISTICS:
        return this.formatStatistics(data)

      default:
        return JSON.stringify(data, null, 2)
    }
  }

  /**
   * Format student profile data
   */
  private formatStudentProfile(profile: any): string {
    if (Array.isArray(profile)) {
      if (profile.length === 0) return 'ไม่พบข้อมูลนักเรียน'
      profile = profile[0]
    }

    return `
ข้อมูลนักเรียน
ชื่อ: ${profile.name}
ชั้น: ${profile.class || 'ไม่ระบุ'}
ระดับชั้น: ${profile.grade_level || '-'}
วันเกิด: ${profile.date_of_birth || '-'}
เบอร์โทร: ${profile.phone || '-'}
ที่อยู่: ${profile.address || '-'}
ชื่อผู้ปกครอง: ${profile.parent_name || '-'}
ติดต่อฉุกเฉิน: ${profile.emergency_contact || '-'}
    `.trim()
  }

  /**
   * Format grades data
   */
  private formatGrades(grades: any): string {
    if (!Array.isArray(grades) || grades.length === 0) {
      return 'ไม่พบข้อมูลเกรด'
    }

    let text = 'ผลการเรียน\n\n'
    for (const grade of grades) {
      text += `${grade.subject}: ${grade.score} (${grade.grade})\n`
    }
    return text.trim()
  }

  /**
   * Format attendance data
   */
  private formatAttendance(attendance: any): string {
    if (attendance.records && Array.isArray(attendance.records)) {
      const stats = attendance.statistics || {}
      return `
สถิติการมาเรียน
มาเรียน: ${stats.present || 0} วัน
ขาดเรียน: ${stats.absent || 0} วัน
มาสาย: ${stats.late || 0} วัน
ลา: ${stats.excused || 0} วัน
อัตราการมาเรียน: ${stats.attendance_rate || 0}%
      `.trim()
    }

    if (!Array.isArray(attendance) || attendance.length === 0) {
      return 'ไม่พบข้อมูลการมาเรียน'
    }

    let text = 'บันทึกการมาเรียน (ล่าสุด 5 รายการ)\n\n'
    for (const record of attendance.slice(0, 5)) {
      text += `${record.date}: ${record.status}\n`
    }
    return text.trim()
  }

  /**
   * Format schedule data
   */
  private formatSchedule(schedule: any): string {
    if (!Array.isArray(schedule) || schedule.length === 0) {
      return 'ไม่พบตารางเรียน'
    }

    let text = 'ตารางเรียน\n\n'
    for (const item of schedule) {
      text += `${item.subject} (${item.class_name})`
      if (item.room_number) text += ` - ห้อง ${item.room_number}`
      if (item.teacher_name) text += ` - ครู ${item.teacher_name}`
      text += '\n'
    }
    return text.trim()
  }

  /**
   * Format statistics data
   */
  private formatStatistics(stats: any): string {
    if (stats.count !== undefined) {
      // Single count result
      return `จำนวน${stats.entity}: ${stats.count}`
    }

    // Full statistics
    return `
สถิติโรงเรียน
นักเรียนทั้งหมด: ${stats.total_students || 0} คน
ครูทั้งหมด: ${stats.total_teachers || 0} คน
ห้องเรียนทั้งหมด: ${stats.total_classes || 0} ห้อง
    `.trim()
  }

  /**
   * Format error response
   */
  private formatErrorResponse(config: {
    intent: Intent
    action: DataAction | null
    handlerAction: Action | null
    entities: ExtractedEntities
    normalizedQuery: string
    executionPath: 'error'
    executionTime: number
    originalQuery: string
    error?: string
  }): PipelineResponse {
    return {
      success: false,
      text: config.error || 'ขออภัย ไม่สามารถดำเนินการตามคำขอได้ กรุณาลองใหม่อีกครั้ง',
      emotion: 'concerned',
      ...config
    }
  }
}

// ============================================================
// GLOBAL PIPELINE INSTANCE
// ============================================================

let globalPipeline: PipelineService | null = null

/**
 * Get or create the global pipeline service
 */
export function getPipelineService(registry?: HandlerRegistry): PipelineService {
  if (!globalPipeline) {
    const handlerRegistry = registry || new HandlerRegistry()
    globalPipeline = new PipelineService(handlerRegistry)
  }
  return globalPipeline
}

/**
 * Reset the global pipeline service
 */
export function resetPipelineService(): void {
  globalPipeline = null
}
