/**
 * Hybrid Retrieval Service
 *
 * Combines multiple memory sources for comprehensive context retrieval.
 * Merges and ranks results from recent memory, semantic search, summaries, and RAG.
 */

import { getRecentMemoryService, FormattedMemoryContext } from './recent-memory.service.js'
import { getSemanticMemoryService, SemanticMemoryResult } from './semantic-memory.service.js'
import { getSessionSummaryService, SessionSummary } from './summary.service.js'
import { searchByEmbedding, SearchResult } from '../rag/services/supabase.service.js'
import { embed } from '../embeddings/index.js'

// ============================================================
// TYPES
// ============================================================

export interface RetrievalOptions {
  userId: string
  sessionId: string
  query: string
  rewrittenQuery?: string

  // Source toggles
  includeRecentMemory?: boolean
  includeSemanticHistory?: boolean
  includeSummaries?: boolean
  includeRAG?: boolean

  // Limits
  recentMemoryLimit?: number
  semanticLimit?: number
  summaryLimit?: number
  ragLimit?: number

  // Thresholds
  semanticThreshold?: number
  minImportance?: number

  // Token budget
  maxTotalTokens?: number
}

export interface RetrievedContext {
  recentMemory: FormattedMemoryContext
  semanticHistory: SemanticMemoryResult
  summaries: SessionSummary[]
  ragDocuments: Array<{
    content: string
    similarity: number
    category: string
  }>

  // Merged and ranked
  mergedContext: string
  totalSources: number
  estimatedTokens: number
  sourcesByRelevance: SourceSegment[]
}

export interface SourceSegment {
  content: string
  source: 'recent' | 'semantic' | 'summary' | 'rag'
  relevanceScore: number
  deduplicated: boolean
}

// ============================================================
// CONSTANTS
// ============================================================

const DEFAULT_LIMITS = {
  recentMemory: 8,
  semantic: 5,
  summary: 2,
  rag: 5
}

const DEFAULT_THRESHOLDS = {
  semantic: 0.7,
  minImportance: 0.3
}

const TOKEN_BUDGET = 2000 // Total token budget for context
const TOKEN_PER_CHAR = 0.3

// Source priority for ranking
const SOURCE_PRIORITY = {
  recent: 1.0,      // Highest: most recent conversation
  rag: 0.9,         // High: factual knowledge base
  semantic: 0.8,    // Medium-High: related history
  summary: 0.7      // Medium: condensed summaries
}

// ============================================================
// HYBRID RETRIEVAL SERVICE
// ============================================================

export class HybridRetrievalService {
  private recentMemory = getRecentMemoryService()
  private semanticMemory = getSemanticMemoryService()
  private summaryService = getSessionSummaryService()

  /**
   * Retrieve context from all sources
   */
  async retrieve(options: RetrievalOptions): Promise<RetrievedContext> {
    const {
      userId,
      sessionId,
      query,
      rewrittenQuery,
      includeRecentMemory = true,
      includeSemanticHistory = true,
      includeSummaries = true,
      includeRAG = true,
      recentMemoryLimit = DEFAULT_LIMITS.recentMemory,
      semanticLimit = DEFAULT_LIMITS.semantic,
      summaryLimit = DEFAULT_LIMITS.summary,
      ragLimit = DEFAULT_LIMITS.rag,
      semanticThreshold = DEFAULT_THRESHOLDS.semantic,
      minImportance = DEFAULT_THRESHOLDS.minImportance,
      maxTotalTokens = TOKEN_BUDGET
    } = options

    // Pre-compute embedding once to avoid redundant calls
    const sharedEmbedding = (includeSemanticHistory || includeSummaries || includeRAG) 
      ? await embed(rewrittenQuery || query) 
      : null

    // Parallel retrieval from all sources
    const [recentMemory, semanticHistory, summaries, ragDocuments] = await Promise.all([
      includeRecentMemory ?
        this.recentMemory.formatMemoryContext({
          sessionId,
          userId,
          limit: recentMemoryLimit,
          minImportance,
          maxTokens: maxTotalTokens * 0.3 // 30% to recent
        }) :
        this.emptyRecentMemory(),

      includeSemanticHistory ?
        this.semanticMemory.retrieve({
          userId,
          query: rewrittenQuery || query,
          queryEmbedding: sharedEmbedding || undefined,
          sessionId,
          threshold: semanticThreshold,
          limit: semanticLimit,
          minImportance
        }) :
        this.emptySemanticMemory(),

      includeSummaries ?
        this.summaryService.searchSimilarSummaries(
          userId,
          rewrittenQuery || query,
          0.65,
          summaryLimit,
          sharedEmbedding || undefined
        ) :
        Promise.resolve([]),

      includeRAG ?
        this.retrieveRAGDocuments(rewrittenQuery || query, ragLimit, sharedEmbedding || undefined) :
        Promise.resolve([])
    ])

    // Merge and rank
    const segments = this.createSegments(
      recentMemory,
      semanticHistory,
      summaries,
      ragDocuments
    )

    // Deduplicate
    const deduplicated = this.deduplicateSegments(segments)

    // Rank by relevance
    const ranked = this.rankSegments(deduplicated, query)

    // Build merged context within token budget
    const { mergedContext, estimatedTokens } = this.buildMergedContext(
      ranked,
      maxTotalTokens
    )

    return {
      recentMemory,
      semanticHistory,
      summaries,
      ragDocuments,
      mergedContext,
      totalSources: ranked.length,
      estimatedTokens,
      sourcesByRelevance: ranked
    }
  }

  /**
   * Retrieve RAG documents
   */
  private async retrieveRAGDocuments(
    query: string, 
    limit: number,
    queryEmbedding?: number[]
  ): Promise<Array<{
    content: string
    similarity: number
    category: string
  }>> {
    try {
      const embedding = queryEmbedding || await embed(query)

      if (!embedding) {
        console.error('[HybridRetrieval] Failed to generate query embedding')
        return []
      }

      const results = await searchByEmbedding(embedding, limit, 0.7)

      return results.map(doc => ({
        content: doc.content,
        similarity: doc.similarity,
        category: doc.category || 'general'
      }))
    } catch (error) {
      console.error('[HybridRetrieval] RAG retrieval failed:', error)
      return []
    }
  }

  /**
   * Create source segments from all retrieval results
   */
  private createSegments(
    recentMemory: FormattedMemoryContext,
    semanticHistory: SemanticMemoryResult,
    summaries: SessionSummary[],
    ragDocuments: Array<{ content: string; similarity: number; category: string }>
  ): SourceSegment[] {
    const segments: SourceSegment[] = []

    // Recent memory segments
    for (const msg of recentMemory.messages) {
      segments.push({
        content: msg,
        source: 'recent',
        relevanceScore: SOURCE_PRIORITY.recent,
        deduplicated: false
      })
    }

    // Semantic history segments
    for (const msg of semanticHistory.messages) {
      segments.push({
        content: `[Previous conversation] ${msg.content}`,
        source: 'semantic',
        relevanceScore: SOURCE_PRIORITY.semantic * msg.similarity,
        deduplicated: false
      })
    }

    // Summary segments
    for (const summary of summaries) {
      segments.push({
        content: `[Conversation summary] ${summary.summary}`,
        source: 'summary',
        relevanceScore: SOURCE_PRIORITY.summary,
        deduplicated: false
      })
    }

    // RAG document segments
    for (const doc of ragDocuments) {
      segments.push({
        content: `[Knowledge: ${doc.category}] ${doc.content}`,
        source: 'rag',
        relevanceScore: SOURCE_PRIORITY.rag * doc.similarity,
        deduplicated: false
      })
    }

    return segments
  }

  /**
   * Deduplicate similar content
   */
  private deduplicateSegments(segments: SourceSegment[]): SourceSegment[] {
    const seen = new Set<string>()
    const result: SourceSegment[] = []

    for (const segment of segments) {
      // Create a normalized key for comparison
      const normalized = this.normalizeContent(segment.content)

      if (!seen.has(normalized)) {
        seen.add(normalized)
        segment.deduplicated = false
        result.push(segment)
      } else {
        segment.deduplicated = true
        // Don't add duplicate, but mark it
      }
    }

    return result
  }

  /**
   * Normalize content for deduplication
   */
  private normalizeContent(content: string): string {
    return content
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s฀-๿]/g, '') // Keep Thai characters
      .substring(0, 100) // Compare first 100 chars
  }

  /**
   * Rank segments by relevance
   */
  private rankSegments(segments: SourceSegment[], query: string): SourceSegment[] {
    return segments
      .filter(s => !s.deduplicated)
      .map(segment => ({
        ...segment,
        relevanceScore: this.calculateRelevance(segment, query)
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
  }

  /**
   * Calculate relevance score for a segment
   */
  private calculateRelevance(segment: SourceSegment, query: string): number {
    let score = segment.relevanceScore

    // Boost for query term matches
    const queryTerms = query.toLowerCase().split(/\s+/)
    const contentLower = segment.content.toLowerCase()

    for (const term of queryTerms) {
      if (term.length > 2 && contentLower.includes(term)) {
        score += 0.1
      }
    }

    return Math.min(score, 1.0)
  }

  /**
   * Build merged context within token budget
   */
  private buildMergedContext(
    segments: SourceSegment[],
    maxTokens: number
  ): { mergedContext: string; estimatedTokens: number } {
    const parts: string[] = []
    let totalTokens = 0

    // Group by source for better organization
    const bySource = this.groupBySource(segments)

    // Add recent memory first (highest priority)
    if (bySource.recent.length > 0) {
      const section = this.formatSection('Recent Conversation', bySource.recent)
      const tokens = this.estimateTokens(section)

      if (totalTokens + tokens <= maxTokens) {
        parts.push(section)
        totalTokens += tokens
      }
    }

    // Add RAG documents (high priority)
    if (bySource.rag.length > 0) {
      const section = this.formatSection('Knowledge Base', bySource.rag)
      const tokens = this.estimateTokens(section)

      if (totalTokens + tokens <= maxTokens) {
        parts.push(section)
        totalTokens += tokens
      }
    }

    // Add semantic history
    if (bySource.semantic.length > 0) {
      const section = this.formatSection('Related Conversations', bySource.semantic)
      const tokens = this.estimateTokens(section)

      if (totalTokens + tokens <= maxTokens) {
        parts.push(section)
        totalTokens += tokens
      }
    }

    // Add summaries
    if (bySource.summary.length > 0) {
      const section = this.formatSection('Conversation Summaries', bySource.summary)
      const tokens = this.estimateTokens(section)

      if (totalTokens + tokens <= maxTokens) {
        parts.push(section)
        totalTokens += tokens
      }
    }

    return {
      mergedContext: parts.join('\n\n'),
      estimatedTokens: totalTokens
    }
  }

  /**
   * Group segments by source
   */
  private groupBySource(segments: SourceSegment[]): Record<string, SourceSegment[]> {
    const grouped: Record<string, SourceSegment[]> = {
      recent: [],
      semantic: [],
      summary: [],
      rag: []
    }

    for (const segment of segments) {
      grouped[segment.source].push(segment)
    }

    return grouped
  }

  /**
   * Format a section
   */
  private formatSection(title: string, segments: SourceSegment[]): string {
    if (segments.length === 0) return ''

    const contents = segments.map(s => s.content).join('\n')
    return `=== ${title} ===\n${contents}`
  }

  /**
   * Estimate token count for text
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length * TOKEN_PER_CHAR)
  }

  /**
   * Empty result helpers
   */
  private emptyRecentMemory(): FormattedMemoryContext {
    return {
      messages: [],
      tokenCount: 0,
      messageCount: 0,
      hasPronouns: false,
      summary: ''
    }
  }

  private emptySemanticMemory(): SemanticMemoryResult {
    return {
      messages: [],
      totalFound: 0,
      averageSimilarity: 0,
      hasHighRelevance: false,
      formatted: ''
    }
  }

  /**
   * Get retrieval statistics
   */
  getStats(context: RetrievedContext): {
    totalSources: number
    bySource: Record<string, number>
    tokenDistribution: Record<string, number>
  } {
    return {
      totalSources: context.totalSources,
      bySource: {
        recent: context.recentMemory.messageCount,
        semantic: context.semanticHistory.totalFound,
        summary: context.summaries.length,
        rag: context.ragDocuments.length
      },
      tokenDistribution: {
        recent: this.estimateTokens(context.recentMemory.messages.join('\n')),
        semantic: this.estimateTokens(context.semanticHistory.formatted),
        summary: this.estimateTokens(context.summaries.map(s => s.summary).join('\n')),
        rag: this.estimateTokens(context.ragDocuments.map(d => d.content).join('\n'))
      }
    }
  }
}

// ============================================================
// GLOBAL INSTANCE
// ============================================================

let globalInstance: HybridRetrievalService | null = null

export function getHybridRetrievalService(): HybridRetrievalService {
  if (!globalInstance) {
    globalInstance = new HybridRetrievalService()
  }
  return globalInstance
}
