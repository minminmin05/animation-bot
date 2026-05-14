/**
 * Memory System Index
 *
 * Central exports for all memory-related services.
 */

// Core services
export { getMemoryManagerService, resetMemoryManagerService } from './memory-manager.service.js'
export { getConversationalPipelineService, resetConversationalPipelineService } from './conversational-pipeline.service.js'

// Individual memory layers
export { getRecentMemoryService } from './recent-memory.service.js'
export { getSemanticMemoryService } from './semantic-memory.service.js'
export { getSessionSummaryService } from './summary.service.js'
export { getQueryRewriterService } from './query-rewriter.service.js'
export { getHybridRetrievalService } from './hybrid-retrieval.service.js'
export { getImportanceScoringService } from './importance.service.js'
export { getAsyncProcessorService, resetAsyncProcessorService } from './async-processor.service.js'

// Type exports
export type { ChatMessage, RecentMemoryOptions, FormattedMemoryContext } from './recent-memory.service.js'
export type { SemanticMemoryOptions, SemanticMessage, SemanticMemoryResult } from './semantic-memory.service.js'
export type { SessionSummary, SummaryOptions, SummaryGenerationOptions } from './summary.service.js'
export type { RewriteContext, RewriteResult, RewriteOptions } from './query-rewriter.service.js'
export type { RetrievalOptions, RetrievedContext, SourceSegment } from './hybrid-retrieval.service.js'
export type { ImportanceResult, ScoringOptions } from './importance.service.js'
export type { ProcessingJob, ProcessingOptions, ProcessorStats } from './async-processor.service.js'
export type {
  ChatSession,
  MessageToSave,
  MemoryContext,
  MemoryManagerConfig
} from './memory-manager.service.js'
export type {
  ConversationalRequest,
  ConversationalResponse,
  PipelineConfig
} from './conversational-pipeline.service.js'

// Utility functions
export { getMemoryManagerService as createMemoryManager } from './memory-manager.service.js'
export { getConversationalPipelineService as createConversationalPipeline } from './conversational-pipeline.service.js'
