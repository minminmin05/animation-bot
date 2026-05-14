/**
 * School Management App - Server Main Index
 *
 * New architecture exports - Phase 1-6 complete
 *
 * Architecture:
 * 1. Core Infrastructure (core/)
 *    - Error handling, Entity extraction, Normalization
 *    - Handler interfaces, Repository interfaces
 *
 * 2. Handlers (handlers/)
 *    - StudentProfileHandler, GradesHandler, AttendanceHandler
 *    - ScheduleHandler, StatisticsHandler, KnowledgeHandler
 *
 * 3. Repositories (repositories/)
 *    - StudentRepository, GradeRepository, AttendanceRepository
 *    - ScheduleRepository, PaymentRepository
 *
 * 4. Pipeline (pipeline/)
 *    - PipelineService: Main orchestrator with fallback hierarchy
 *
 * 5. Existing Services (rag/services/, services/)
 *    - IntentService, ActionMapper, RAGService, LLMService
 *    - (kept for backward compatibility)
 */

// ============================================================
// CORE INFRASTRUCTURE
// ============================================================

export * from './core/index.js'

// ============================================================
// HANDLERS
// ============================================================

export {
  StudentProfileHandler,
  GradesHandler,
  AttendanceHandler,
  ScheduleHandler,
  StatisticsHandler,
  KnowledgeHandler,
  initializeHandlers,
  createHandlerRegistry
} from './handlers/index.js'

// ============================================================
// REPOSITORIES
// ============================================================

export {
  StudentRepository,
  GradeRepository,
  AttendanceRepository,
  ScheduleRepository,
  PaymentRepository
} from './repositories/index.js'

// ============================================================
// PIPELINE
// ============================================================

export {
  PipelineService,
  getPipelineService,
  resetPipelineService,
  type PipelineRequest,
  type PipelineResponse
} from './pipeline/index.js'

// ============================================================
// EXISTING SERVICES (backward compatibility)
// ============================================================

// Intent and Action services
export { classifyIntent, Intent } from './rag/services/intent.service.js'
export { detectDataAction, getActionDescription, type DataAction } from './services/action-mapper.service.js'

// RAG and LLM services
export { searchRagDocuments } from './rag/services/rag.service.js'
export { generateLLMResponse } from './rag/services/llm.service.js'

// Legacy grade service
export {
  getPersonalDataByAction,
  getStudentProfile,
  getStudentGrades,
  getStudentAttendance,
  getStudentSchedule
} from './services/grade.service.js'
