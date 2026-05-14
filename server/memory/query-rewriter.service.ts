/**
 * Query Rewriter Service
 *
 * Rewrites user queries to resolve ambiguous references and improve retrieval.
 * Handles pronoun resolution and context expansion.
 */

import { getRecentMemoryService, ChatMessage } from './recent-memory.service.js'
import { getSessionSummaryService, SessionSummary } from './summary.service.js'
import { generateWithProvider, LLMProvider } from '../rag/services/llm.service.js'

// ============================================================
// TYPES
// ============================================================

export interface RewriteContext {
  sessionId: string
  userId: string
  recentMessages?: ChatMessage[]
  sessionSummary?: SessionSummary
}

export interface RewriteResult {
  originalQuery: string
  rewrittenQuery: string
  changes: string[]
  resolvedReferences: string[]
  confidence: number
  needsRewrite: boolean
}

export interface RewriteOptions {
  useLLM?: boolean
  maxHistory?: number
  includeSummaries?: boolean
}

// ============================================================
// CONSTANTS
// ============================================================

// Pronoun patterns that need resolution
const PRONOUN_PATTERNS = {
  thai: {
    subject: ['มัน', 'เขา', 'เธอ', 'พวกเขา', 'พวกมัน'],
    demonstrative: ['อันนั้น', 'อันนี้', 'ตรงนั้น', 'ตรงนี้'],
    possessive: ['ของเขา', 'ของมัน', 'ของฉัน', 'ของผม']
  },
  english: {
    subject: ['it', 'he', 'she', 'they', 'this one', 'that one'],
    demonstrative: ['that', 'this', 'there', 'here'],
    possessive: ['his', 'hers', 'theirs', 'my', 'mine']
  }
}

// Common abbreviation expansions
const ABBREVIATION_EXPANSIONS = {
  thai: {
    'ม.': 'มัธยม',
    'ป.': 'ประถม',
    'วิทย์': 'วิทยาศาสตร์',
    'คณิต': 'คณิตศาสตร์'
  },
  english: {
    'math': 'mathematics',
    'sci': 'science',
    'eng': 'english',
    'gpa': 'grade point average',
    'sched': 'schedule'
  }
}

// ============================================================
// QUERY REWRITER SERVICE
// ============================================================

export class QueryRewriterService {
  private recentMemory = getRecentMemoryService()
  private summaryService = getSessionSummaryService()

  /**
   * Rewrite a query with context
   */
  async rewrite(
    query: string,
    context: RewriteContext,
    options: RewriteOptions = {}
  ): Promise<RewriteResult> {
    const {
      useLLM = false,
      maxHistory = 6,
      includeSummaries = true
    } = options

    const changes: string[] = []
    const resolvedReferences: string[] = []
    let rewrittenQuery = query
    let needsRewrite = false

    // Step 1: Check if rewrite is needed
    const hasPronouns = this.detectPronouns(query)
    const isShortQuery = query.split(' ').length < 4

    if (!hasPronouns && !isShortQuery) {
      return this.noRewriteResult(query)
    }

    // Step 2: Fetch context
    const recentMessages = context.recentMessages ||
      await this.recentMemory.getRecentMessages({
        sessionId: context.sessionId,
        userId: context.userId,
        limit: maxHistory
      })

    const sessionSummary = context.sessionSummary ||
      (includeSummaries ?
        await this.summaryService.getCurrentSummary(context.sessionId, context.userId) :
        null)

    // Step 3: Pattern-based rewriting
    const patternResult = this.applyPatternRewrites(query, recentMessages, sessionSummary)
    if (patternResult.needsRewrite) {
      rewrittenQuery = patternResult.query
      changes.push(...patternResult.changes)
      resolvedReferences.push(...patternResult.resolvedReferences)
      needsRewrite = true
    }

    // Step 4: LLM-based rewriting (if enabled and needed)
    if (useLLM && (hasPronouns || changes.length > 0)) {
      const llmResult = await this.applyLLMRewrite(
        rewrittenQuery,
        recentMessages,
        sessionSummary
      )
      if (llmResult.needsRewrite) {
        rewrittenQuery = llmResult.query
        changes.push(...llmResult.changes)
        needsRewrite = true
      }
    }

    // Step 5: Abbreviation expansion
    const expanded = this.expandAbbreviations(rewrittenQuery)
    if (expanded !== rewrittenQuery) {
      rewrittenQuery = expanded
      changes.push('Expanded abbreviations')
      needsRewrite = true
    }

    // Calculate confidence based on changes
    const confidence = this.calculateConfidence(query, rewrittenQuery, changes.length)

    return {
      originalQuery: query,
      rewrittenQuery,
      changes,
      resolvedReferences,
      confidence,
      needsRewrite
    }
  }

  /**
   * Detect pronouns in query
   */
  private detectPronouns(query: string): boolean {
    const lower = query.toLowerCase()

    // Check Thai pronouns
    for (const category of Object.values(PRONOUN_PATTERNS.thai)) {
      for (const pronoun of category) {
        if (lower.includes(pronoun)) return true
      }
    }

    // Check English pronouns
    for (const category of Object.values(PRONOUN_PATTERNS.english)) {
      for (const pronoun of category) {
        const pattern = new RegExp(`\\b${pronoun}\\b`, 'i')
        if (pattern.test(lower)) return true
      }
    }

    return false
  }

  /**
   * Apply pattern-based rewrites
   */
  private applyPatternRewrites(
    query: string,
    recentMessages: ChatMessage[],
    sessionSummary: SessionSummary | null
  ): { query: string; changes: string[]; resolvedReferences: string[]; needsRewrite: boolean } {
    let result = query
    const changes: string[] = []
    const resolved: string[] = []

    // Thai pronoun resolution
    if (/มัน/.test(result)) {
      const resolved = this.resolveReference('มัน', recentMessages)
      if (resolved) {
        result = result.replace(/มัน/g, resolved)
        changes.push('Resolved "มัน"')
        resolved.push(resolved)
      }
    }

    if (/เขา/.test(result)) {
      const resolved = this.resolveReference('เขา', recentMessages)
      if (resolved) {
        result = result.replace(/เขา/g, resolved)
        changes.push('Resolved "เขา"')
        resolved.push(resolved)
      }
    }

    // Demonstrative resolution
    if (/อันนั้น|อันนี้/.test(result)) {
      const resolved = this.resolveReference(result.includes('อันนั้น') ? 'อันนั้น' : 'อันนี้', recentMessages)
      if (resolved) {
        result = result.replace(/อันนั้น|อันนี้/g, resolved)
        changes.push('Resolved demonstrative')
        resolved.push(resolved)
      }
    }

    // English pronoun resolution
    if (/\bit\b/i.test(result)) {
      const resolved = this.resolveReference('it', recentMessages)
      if (resolved) {
        result = result.replace(/\bit\b/gi, resolved)
        changes.push('Resolved "it"')
        resolved.push(resolved)
      }
    }

    if (/\bthat\b|\bthis\b/i.test(result)) {
      const resolved = this.resolveReference(result.includes('that') ? 'that' : 'this', recentMessages)
      if (resolved) {
        result = result.replace(/\bthat\b|\bthis\b/gi, resolved)
        changes.push('Resolved demonstrative')
        resolved.push(resolved)
      }
    }

    // Add context from summary if available
    if (sessionSummary && result.length < 50) {
      result = `${result} (context: ${sessionSummary.summary.substring(0, 100)})`
      changes.push('Added session context')
    }

    return {
      query: result,
      changes,
      resolvedReferences: resolved,
      needsRewrite: changes.length > 0
    }
  }

  /**
   * Resolve a pronoun reference from recent messages
   */
  private resolveReference(
    pronoun: string,
    recentMessages: ChatMessage[]
  ): string | null {
    // Look for the most recent noun phrase or topic
    for (let i = recentMessages.length - 1; i >= 0; i--) {
      const msg = recentMessages[i]
      if (msg.role === 'assistant') {
        // Look for specific entities in assistant responses
        const entities = this.extractEntities(msg.content)
        if (entities.length > 0) {
          return entities[0] // Return the most recent entity
        }
      }
    }

    // Look for nouns in user queries
    for (let i = recentMessages.length - 1; i >= 0; i--) {
      const msg = recentMessages[i]
      if (msg.role === 'user') {
        const entities = this.extractEntities(msg.content)
        if (entities.length > 0) {
          return entities[0]
        }
      }
    }

    return null
  }

  /**
   * Extract entities/nouns from text
   */
  private extractEntities(text: string): string[] {
    const entities: string[] = []

    // Thai noun patterns (simplified)
    const thaiNounPatterns = [
      /([ก-ฮ]{2,})(เกรด|คะแนน|การมาเรียน|ตาราง|ค่าเทอม)/,
      /(วิชา|ห้อง|ครู|นักเรียน)\s+([ก-ฮ]{2,})/
    ]

    // English noun patterns
    const englishNounPatterns = [
      /\b(grade|score|attendance|schedule|tuition)\s+(of|for)\s+(\w+)/i,
      /\b(student|teacher|class|subject)\s+(\w+)/i
    ]

    for (const pattern of thaiNounPatterns) {
      const match = text.match(pattern)
      if (match) entities.push(match[0])
    }

    for (const pattern of englishNounPatterns) {
      const match = text.match(pattern)
      if (match) entities.push(match[0])
    }

    return entities
  }

  /**
   * Apply LLM-based query rewriting
   */
  private async applyLLMRewrite(
    query: string,
    recentMessages: ChatMessage[],
    sessionSummary: SessionSummary | null
  ): Promise<{ query: string; changes: string[]; needsRewrite: boolean }> {
    // Format recent context
    const context = recentMessages
      .slice(-4)
      .map(m => `${m.role}: ${m.content}`)
      .join('\n')

    const summaryContext = sessionSummary ?
      `\nPrevious conversation summary: ${sessionSummary.summary}` :
      ''

    const prompt = `Rewrite the following query to be more specific and complete, using the conversation context to resolve any ambiguous references.

Context:
${context}${summaryContext}

Query: "${query}"

Rules:
- Replace pronouns (มัน, เขา, it, they, etc.) with specific nouns from context
- Keep the query in the same language (Thai or English)
- Make the query more specific but don't add new information
- Return ONLY the rewritten query, no explanation

Rewritten query:`

    try {
      const provider = (process.env.LLM_PROVIDER as LLMProvider) || 'minimax'
      const result = await generateWithProvider(provider, prompt)

      const trimmed = result.trim()
      if (trimmed && trimmed !== query) {
        return {
          query: trimmed,
          changes: ['LLM-based rewrite'],
          needsRewrite: true
        }
      }
    } catch (error) {
      console.error('[QueryRewriter] LLM rewrite failed:', error)
    }

    return { query, changes: [], needsRewrite: false }
  }

  /**
   * Expand abbreviations in query
   */
  private expandAbbreviations(query: string): string {
    let result = query

    // Thai abbreviations
    for (const [abbr, full] of Object.entries(ABBREVIATION_EXPANSIONS.thai)) {
      const pattern = new RegExp(abbr, 'g')
      if (pattern.test(result)) {
        result = result.replace(pattern, full)
      }
    }

    // English abbreviations
    for (const [abbr, full] of Object.entries(ABBREVIATION_EXPANSIONS.english)) {
      const pattern = new RegExp(`\\b${abbr}\\b`, 'gi')
      if (pattern.test(result)) {
        result = result.replace(pattern, full)
      }
    }

    return result
  }

  /**
   * Calculate confidence score for the rewrite
   */
  private calculateConfidence(
    original: string,
    rewritten: string,
    changesCount: number
  ): number {
    // Base confidence
    let confidence = 0.5

    // More changes = higher confidence (we actively improved it)
    confidence += Math.min(changesCount * 0.15, 0.3)

    // Significant length change = active rewriting
    const lengthRatio = rewritten.length / original.length
    if (lengthRatio > 1.5) {
      confidence += 0.1
    }

    return Math.min(confidence, 1.0)
  }

  /**
   * Create no-rewrite result
   */
  private noRewriteResult(query: string): RewriteResult {
    return {
      originalQuery: query,
      rewrittenQuery: query,
      changes: [],
      resolvedReferences: [],
      confidence: 1.0,
      needsRewrite: false
    }
  }

  /**
   * Batch rewrite multiple queries
   */
  async batchRewrite(
    queries: string[],
    context: RewriteContext,
    options?: RewriteOptions
  ): Promise<RewriteResult[]> {
    const results: RewriteResult[] = []

    for (const query of queries) {
      const result = await this.rewrite(query, context, options)
      results.push(result)
    }

    return results
  }

  /**
   * Check if a query needs rewriting
   */
  needsRewriting(query: string): boolean {
    return this.detectPronouns(query) || query.split(' ').length < 4
  }
}

// ============================================================
// GLOBAL INSTANCE
// ============================================================

let globalInstance: QueryRewriterService | null = null

export function getQueryRewriterService(): QueryRewriterService {
  if (!globalInstance) {
    globalInstance = new QueryRewriterService()
  }
  return globalInstance
}
