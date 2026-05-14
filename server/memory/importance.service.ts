/**
 * Importance Scoring Service
 *
 * Calculates importance scores for chat messages (0.0 - 1.0).
 * Higher scores indicate messages worth storing in long-term memory.
 */

// ============================================================
// TYPES
// ============================================================

export interface ImportanceResult {
  score: number
  reason: string
  category: 'critical' | 'high' | 'medium' | 'low' | 'noise'
}

export interface ScoringOptions {
  role?: 'user' | 'assistant' | 'system'
  contentLength?: number
  hasEntities?: boolean
  isQuestion?: boolean
  hasKeywords?: boolean
}

// ============================================================
// CONSTANTS
// ============================================================

const CRITICAL_THRESHOLD = 0.8
const HIGH_THRESHOLD = 0.6
const MEDIUM_THRESHOLD = 0.4
const LOW_THRESHOLD = 0.2

// ============================================================
// SCORING PATTERNS
// ============================================================

// Critical importance patterns (0.8+)
const CRITICAL_PATTERNS = [
  // User preferences explicitly stated
  { pattern: /(ชอบ|ไม่ชอบ|ต้องการ|อยากได้|prefer|like|dislike|want|need)/i, weight: 0.9, reason: 'User preference' },
  // Technical issues and solutions
  { pattern: /(แก้.*แล้ว|fix.*solved|วิธีแก้|solution|how to fix)/i, weight: 0.85, reason: 'Solution documented' },
  // Important data queries
  { pattern: /(เกรด|คะแนน|ผลการเรียน|grade|score|gpa|result)/i, weight: 0.85, reason: 'Academic data' },
  // Schedule/time-critical information
  { pattern: /(ตารางเรียน|ตารางสอบ|schedule|exam|deadline|วันนี้|พรุ่งนี้)/i, weight: 0.8, reason: 'Time-critical info' },
  // Payment/financial
  { pattern: /(ค่าเทอม|ค่าธรรมเนียม|จ่าย|ชำระ|tuition|payment|fee|paid)/i, weight: 0.85, reason: 'Financial info' },
  // Contact information
  { pattern: /(เบอร์|โทร|phone|tel|email|contact)/i, weight: 0.85, reason: 'Contact info' },
  // Problems/issues
  { pattern: /(ปัญหา|ไม่ได้|error|bug|issue|problem|fail)/i, weight: 0.8, reason: 'Issue documented' }
]

// High importance patterns (0.6+)
const HIGH_PATTERNS = [
  // Specific questions
  { pattern: /(ทำอย่างไร|วิธี|how to|how do|how does)/i, weight: 0.7, reason: 'Procedural question' },
  // What-is questions
  { pattern: /(คืออะไร|what is|define|meaning)/i, weight: 0.65, reason: 'Definition question' },
  // Status/progress queries
  { pattern: /(สถานะ|progress|status|เสร็จยัง|finished)/i, weight: 0.65, reason: 'Status query' },
  // Rules and policies
  { pattern: /(กฎ|กติกา|ระเบียบ|rule|policy|regulation)/i, weight: 0.7, reason: 'Policy question' },
  // Enrollment/registration
  { pattern: /(สมัคร|ลงทะเบียน|register|enroll|enrollment)/i, weight: 0.7, reason: 'Enrollment query' },
  // Attendance/discipline
  { pattern: /(การมาเรียน|ขาด|สาย|attendance|absent|late)/i, weight: 0.65, reason: 'Attendance query' }
]

// Medium importance patterns (0.4+)
const MEDIUM_PATTERNS = [
  // General questions
  { pattern: /^(มี|อยู่|have|has|is there|are there)/i, weight: 0.5, reason: 'Existence question' },
  // List/count queries
  { pattern: /(รายชื่อ|ทั้งหมด|กี่คน|list|all|how many|count)/i, weight: 0.45, reason: 'List query' },
  // Who/what/where
  { pattern: /^(ใคร|อะไร|ที่ไหน|who|what|where)/i, weight: 0.45, reason: 'Information query' },
  // Greetings with context
  { pattern: /^(สวัสดี.*|หวัดดี.*|hello.*|hi.*).{10,}/i, weight: 0.4, reason: 'Greeting with context' }
]

// Low value/noise patterns (0.0-0.2)
const NOISE_PATTERNS = [
  // Pure greetings
  { pattern: /^(สวัสดี|หวัดดี|ดีจ้า|ดีครับ|ดีค่ะ|hello|hi|hey|halo)$/i, weight: 0.1, reason: 'Greeting' },
  // Acknowledgments
  { pattern: /^(ok|okay|okok|โอ|โอเค|ได้|ใช่|แล้ว|เรียบร้อย)$/i, weight: 0.1, reason: 'Acknowledgment' },
  // Thanks
  { pattern: /^(ขอบคุณ|ขอบใจ|thank|thanks|thx|ทุก(ครับ|คะ))$/i, weight: 0.1, reason: 'Thanks' },
  // Simple yes/no
  { pattern: /^(ใช่|ไม่ใช่|ไม่|yes|no|y|n)$/i, weight: 0.05, reason: 'Simple response' },
  // Goodbye
  { pattern: /^(บาย|ลาก่อน|bye|goodbye|byebye)$/i, weight: 0.05, reason: 'Goodbye' }
]

// Content factors that boost importance
const CONTENT_BOOSTERS = {
  // Has numbers/dates
  hasNumbers: { boost: 0.1, reason: 'Contains specific data' },
  // Has names
  hasNames: { boost: 0.15, reason: 'Contains names' },
  // Length (longer messages often more important)
  length: {
    short: { min: 0, max: 20, boost: 0 },
    medium: { min: 20, max: 50, boost: 0.05 },
    long: { min: 50, max: 100, boost: 0.1 },
    veryLong: { min: 100, max: Infinity, boost: 0.15 }
  },
  // Question marks
  hasQuestion: { boost: 0.05, reason: 'Contains question' },
  // Multiple topics
  hasMultipleTopics: { boost: 0.1, reason: 'Multi-topic message' }
}

// ============================================================
// IMPORTANCE SCORING SERVICE
// ============================================================

export class ImportanceScoringService {
  /**
   * Calculate importance score for a message
   */
  calculateImportance(
    content: string,
    options: ScoringOptions = {}
  ): ImportanceResult {
    const trimmed = content.trim()
    let score = 0.5 // Base score
    const reasons: string[] = []

    // Check for noise patterns first (lowest priority)
    for (const { pattern, weight, reason } of NOISE_PATTERNS) {
      if (pattern.test(trimmed)) {
        score = Math.min(score, weight)
        reasons.push(reason)
        return this.finalizeScore(score, reasons.join(', '))
      }
    }

    // Check critical patterns
    for (const { pattern, weight, reason } of CRITICAL_PATTERNS) {
      if (pattern.test(trimmed)) {
        score = Math.max(score, weight)
        reasons.push(reason)
      }
    }

    // Check high patterns
    for (const { pattern, weight, reason } of HIGH_PATTERNS) {
      if (pattern.test(trimmed)) {
        score = Math.max(score, weight)
        reasons.push(reason)
      }
    }

    // Check medium patterns
    for (const { pattern, weight, reason } of MEDIUM_PATTERNS) {
      if (pattern.test(trimmed)) {
        score = Math.max(score, weight)
        reasons.push(reason)
      }
    }

    // Apply content boosters
    const boosted = this.applyContentBoosters(trimmed, score, options)
    score = boosted.score
    if (boosted.reason) reasons.push(boosted.reason)

    // Adjust based on role
    score = this.adjustForRole(score, options.role)

    // Finalize and return
    return this.finalizeScore(score, reasons.join(', ') || 'Standard message')
  }

  /**
   * Apply content-based boosters
   */
  private applyContentBoosters(
    content: string,
    baseScore: number,
    options: ScoringOptions
  ): { score: number; reason?: string } {
    let score = baseScore
    const reasons: string[] = []

    // Check for numbers
    if (/\d+/.test(content)) {
      score += CONTENT_BOOSTERS.hasNumbers.boost
      reasons.push(CONTENT_BOOSTERS.hasNumbers.reason)
    }

    // Check for names (Thai + English pattern)
    if (this.hasNames(content)) {
      score += CONTENT_BOOSTERS.hasNames.boost
      reasons.push(CONTENT_BOOSTERS.hasNames.reason)
    }

    // Check length
    const length = content.length
    const lengthRange = Object.entries(CONTENT_BOOSTERS.length).find(([key, range]: [string, any]) =>
      length >= range.min && length < range.max
    )
    if (lengthRange) {
      const [, range] = lengthRange
      if (range.boost > 0) {
        score += range.boost
        reasons.push(`Length: ${length} chars`)
      }
    }

    // Check for questions
    if (content.includes('?') || content.includes('?')) {
      score += CONTENT_BOOSTERS.hasQuestion.boost
      reasons.push(CONTENT_BOOSTERS.hasQuestion.reason)
    }

    // Check for multiple topics (heuristic: multiple distinct keywords)
    const topics = this.extractTopics(content)
    if (topics.length >= 2) {
      score += CONTENT_BOOSTERS.hasMultipleTopics.boost
      reasons.push(CONTENT_BOOSTERS.hasMultipleTopics.reason)
    }

    // Use provided options if available
    if (options.hasEntities) {
      score += 0.1
      reasons.push('Has entities')
    }
    if (options.isQuestion) {
      score += 0.05
      reasons.push('Question')
    }
    if (options.hasKeywords) {
      score += 0.05
      reasons.push('Has keywords')
    }

    return {
      score: Math.min(score, 1.0),
      reason: reasons.join(', ')
    }
  }

  /**
   * Check if content contains names
   */
  private hasNames(content: string): boolean {
    // Thai name pattern
    const thaiName = /[ก-ฮ]{2,}\s+[ก-ฮ]{2,}/
    // English name pattern
    const englishName = /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/

    return thaiName.test(content) || englishName.test(content)
  }

  /**
   * Extract topics from content
   */
  private extractTopics(content: string): string[] {
    const topics: string[] = []
    const topicKeywords = [
      'เกรด', 'คะแนน', 'grade', 'score',
      'การมาเรียน', 'attendance',
      'ตารางเรียน', 'schedule',
      'ค่าเทอม', 'tuition',
      'วิชา', 'subject',
      'ครู', 'teacher',
      'นักเรียน', 'student',
      'ห้องเรียน', 'class'
    ]

    for (const keyword of topicKeywords) {
      if (content.toLowerCase().includes(keyword.toLowerCase())) {
        topics.push(keyword)
      }
    }

    return topics
  }

  /**
   * Adjust score based on message role
   */
  private adjustForRole(score: number, role?: string): number {
    if (!role) return score

    switch (role) {
      case 'system':
        // System messages are less important for memory
        return score * 0.3
      case 'assistant':
        // Assistant answers are moderately important
        return score * 0.8
      case 'user':
        // User messages are most important
        return score
      default:
        return score
    }
  }

  /**
   * Finalize score with category
   */
  private finalizeScore(score: number, reason: string): ImportanceResult {
    let category: ImportanceResult['category']

    if (score >= CRITICAL_THRESHOLD) {
      category = 'critical'
    } else if (score >= HIGH_THRESHOLD) {
      category = 'high'
    } else if (score >= MEDIUM_THRESHOLD) {
      category = 'medium'
    } else if (score >= LOW_THRESHOLD) {
      category = 'low'
    } else {
      category = 'noise'
    }

    return {
      score: Math.round(score * 100) / 100,
      reason,
      category
    }
  }

  /**
   * Batch calculate importance for multiple messages
   */
  batchCalculate(messages: Array<{ content: string; role?: string }>): ImportanceResult[] {
    return messages.map(msg =>
      this.calculateImportance(msg.content, { role: msg.role as any })
    )
  }

  /**
   * Get threshold for storing in memory
   */
  getStorageThreshold(category: ImportanceResult['category']): boolean {
    return category !== 'noise'
  }

  /**
   * Check if message should be embedded
   */
  shouldEmbed(result: ImportanceResult): boolean {
    return result.category === 'critical' || result.category === 'high'
  }

  /**
   * Get summary statistics
   */
  getSummaryStatistics(results: ImportanceResult[]): {
    average: number
    byCategory: Record<string, number>
    critical: number
    high: number
    medium: number
    low: number
    noise: number
  } {
    const total = results.length
    const average = total > 0
      ? results.reduce((sum, r) => sum + r.score, 0) / total
      : 0

    const byCategory: Record<string, number> = {}
    for (const result of results) {
      byCategory[result.category] = (byCategory[result.category] || 0) + 1
    }

    return {
      average: Math.round(average * 100) / 100,
      byCategory,
      critical: byCategory.critical || 0,
      high: byCategory.high || 0,
      medium: byCategory.medium || 0,
      low: byCategory.low || 0,
      noise: byCategory.noise || 0
    }
  }
}

// ============================================================
// GLOBAL INSTANCE
// ============================================================

let globalInstance: ImportanceScoringService | null = null

export function getImportanceScoringService(): ImportanceScoringService {
  if (!globalInstance) {
    globalInstance = new ImportanceScoringService()
  }
  return globalInstance
}
