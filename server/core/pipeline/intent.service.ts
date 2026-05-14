/**
 * Intent Classification Service
 *
 * Simplified, rule-based intent classification.
 * Consolidated and simplified from intent.service.ts
 */

import {
  Intent,
  IntentClassification,
  IIntentClassifier,
  getClarificationQuestion,
  requiresAuthorization
} from './intent.types.js'
import { ExtractedEntities } from '../entities/entity.types.js'
import { getEntityService } from '../entities/entity.service.js'
import { normalizeQuery } from '../normalization/index.js'

/**
 * School keywords for intent detection
 */
const SCHOOL_KEYWORDS = {
  thai: [
    // People
    'นักเรียน', 'นร.', 'ครู', 'อาจารย์', 'ผู้สอน', 'ผู้ปกครอง',
    // Academic
    'ห้องเรียน', 'วิชา', 'เกรด', 'คะแนน', 'สอบ', 'ตารางสอบ',
    // Attendance
    'การมาเรียน', 'มาสาย', 'ขาดเรียน', 'ลา',
    // Admin
    'สมัคร', 'ลงทะเบียน', 'ค่าเทอม', 'กฎ', 'กติกา',
    // Facilities
    'ห้องสมุด', 'โรงอาหาร'
  ],
  english: [
    // People
    'student', 'teacher', 'parent', 'guardian',
    // Academic
    'class', 'subject', 'grade', 'score', 'exam', 'test',
    // Attendance
    'attendance', 'absent', 'late',
    // Admin
    'enroll', 'register', 'tuition', 'fee', 'policy', 'rule',
    // Facilities
    'library', 'cafeteria'
  ]
}

/**
 * Personal pronouns
 */
const PERSONAL_PRONOUNS = {
  thai: ['ฉัน', 'ผม', 'ดิฉัน', 'ของฉัน', 'ของผม', 'ตัวฉัน', 'ตัวผม', 'เรา'],
  english: ['my', 'mine', 'me', 'i', 'i am', 'i have', 'i want']
}

/**
 * List/statistics query patterns
 */
const LIST_PATTERNS = [
  /มี.*กี่/,
  /จำนวน.*ทั้งหมด/,
  /รายชื่อ/,
  /ทั้งหมด.*มี/,
  /list\s+(all\s+)?/i,
  /show\s+all/i,
  /how\s+many/i,
  /count/i,
  /who\s+(are|is)/i
]

/**
 * Knowledge query indicators
 */
const KNOWLEDGE_INDICATORS = [
  /คืออะไร/,
  /อย่างไร/,
  /ทำอย่างไร/,
  /วิธี/,
  /กฎ/,
  /กติกา/,
  /ระเบียบ/,
  /นโยบาย/,
  /ประกาศ/,
  /แจ้ง/,
  /faq/i,
  /\bwhat is\b/i,
  /\bhow to\b/i,
  /\bhow do\b/i,
  /\bpolicy\b/i,
  /\brule\b/i
]

/**
 * Intent classifier service
 */
export class IntentClassifier implements IIntentClassifier {
  private entityService = getEntityService()

  /**
   * Classify intent from a query
   */
  classify(query: string, entities?: ExtractedEntities): IntentClassification {
    // First normalize the query
    const normalized = normalizeQuery(query)
    return this.classifyWithNormalization(normalized.normalized, entities)
  }

  /**
   * Classify intent from an already-normalized query
   */
  classifyWithNormalization(
    normalizedQuery: string,
    providedEntities?: ExtractedEntities
  ): IntentClassification {
    // Extract entities if not provided
    const entities = providedEntities || this.entityService.extract(normalizedQuery).entities

    console.log(`\n[Intent] Classifying: "${normalizedQuery}"`)
    console.log(`[Intent] Entities:`, JSON.stringify(entities, null, 2))

    // Rule 1: Admin query (person name + data keyword) → PERSONAL_DATA
    if (this.isAdminQuery(normalizedQuery, entities)) {
      console.log('[Intent] → PERSONAL_DATA (admin query: person + data keyword)')
      return {
        intent: Intent.PERSONAL_DATA,
        confidence: 0.95,
        reasoning: 'Admin query: person name + data keyword'
      }
    }

    // Rule 2: List/statistics query → DATABASE_QUERY
    if (this.isListQuery(normalizedQuery)) {
      console.log('[Intent] → DATABASE_QUERY (list/statistics pattern)')
      return {
        intent: Intent.DATABASE_QUERY,
        confidence: 0.9,
        reasoning: 'List/statistics query pattern detected'
      }
    }

    // Rule 3: Personal pronoun + school keywords → PERSONAL_DATA
    if (this.hasPersonalPronoun(normalizedQuery) && this.hasSchoolKeywords(normalizedQuery)) {
      console.log('[Intent] → PERSONAL_DATA (personal pronoun + school keywords)')
      return {
        intent: Intent.PERSONAL_DATA,
        confidence: 0.85,
        reasoning: 'Personal pronoun + school keywords'
      }
    }

    // Rule 4: Knowledge indicators → KNOWLEDGE
    if (this.isKnowledgeQuery(normalizedQuery)) {
      console.log('[Intent] → KNOWLEDGE (knowledge indicator)')
      return {
        intent: Intent.KNOWLEDGE,
        confidence: 0.85,
        reasoning: 'Knowledge query pattern detected'
      }
    }

    // Rule 5: School keywords only → KNOWLEDGE
    if (this.hasSchoolKeywords(normalizedQuery)) {
      console.log('[Intent] → KNOWLEDGE (school keywords)')
      return {
        intent: Intent.KNOWLEDGE,
        confidence: 0.75,
        reasoning: 'School keywords detected without personal context'
      }
    }

    // Rule 6: Single keyword without context → AMBIGUOUS
    if (this.hasSingleSchoolKeyword(normalizedQuery)) {
      console.log('[Intent] → AMBIGUOUS (single keyword, no context)')
      return {
        intent: Intent.AMBIGUOUS,
        confidence: 0.4,
        reasoning: 'Single school keyword without clear context',
        clarificationQuestion: getClarificationQuestion(normalizedQuery)
      }
    }

    // Rule 7: Person name only (no context) → PERSONAL_DATA (assume profile request)
    if (entities.people && entities.people.length > 0) {
      console.log('[Intent] → PERSONAL_DATA (person name only, defaulting to profile)')
      return {
        intent: Intent.PERSONAL_DATA,
        confidence: 0.65,
        reasoning: `Person name detected ("${entities.people[0]}"), assuming student profile request`
      }
    }

    // Default: UNKNOWN
    console.log('[Intent] → UNKNOWN (no school keywords)')
    return {
      intent: Intent.UNKNOWN,
      confidence: 0.2,
      reasoning: 'No school-related keywords detected'
    }
  }

  /**
   * Check if this is an admin query (person name + data keyword)
   */
  private isAdminQuery(query: string, entities: ExtractedEntities): boolean {
    const hasPerson = entities.people && entities.people.length > 0
    const hasPersonalPronoun = this.hasPersonalPronoun(query)

    // Admin query has person name BUT NO personal pronoun + data keyword
    const hasDataKeyword = /(เกรด|คะแนน|ผลสอบ|การมาเรียน|เข้าเรียน|ขาด|มาสาย|ลา|ตารางเรียน|ตารางสอบ|ค่าเทอม|ชำระ|พฤติกรรม|ทำโทษ|วินัย|ประวัติ|ข้อมูล|grade|score|attendance|schedule|payment|discipline|profile|information)/i.test(query)

    return hasPerson && !hasPersonalPronoun && hasDataKeyword
  }

  /**
   * Check if this is a list/statistics query
   */
  private isListQuery(query: string): boolean {
    return LIST_PATTERNS.some(pattern => pattern.test(query))
  }

  /**
   * Check if query contains personal pronouns
   */
  private hasPersonalPronoun(query: string): boolean {
    const q = query.toLowerCase()

    // Check Thai pronouns
    for (const pronoun of PERSONAL_PRONOUNS.thai) {
      if (q.includes(pronoun)) return true
    }

    // Check English pronouns (with word boundaries)
    for (const pronoun of PERSONAL_PRONOUNS.english) {
      const pattern = new RegExp(`\\b${pronoun}\\b`, 'i')
      if (pattern.test(q)) return true
    }

    return false
  }

  /**
   * Check if query has school keywords
   */
  private hasSchoolKeywords(query: string): boolean {
    const q = query.toLowerCase()

    for (const keyword of [...SCHOOL_KEYWORDS.thai, ...SCHOOL_KEYWORDS.english]) {
      if (q.includes(keyword.toLowerCase())) {
        return true
      }
    }

    return false
  }

  /**
   * Check if query is a knowledge query (not personal)
   */
  private isKnowledgeQuery(query: string): boolean {
    return KNOWLEDGE_INDICATORS.some(pattern => pattern.test(query))
  }

  /**
   * Check if query has only a single school keyword
   */
  private hasSingleSchoolKeyword(query: string): boolean {
    const keywords: string[] = []
    const q = query.toLowerCase()

    for (const keyword of [...SCHOOL_KEYWORDS.thai, ...SCHOOL_KEYWORDS.english]) {
      if (q.includes(keyword.toLowerCase())) {
        keywords.push(keyword)
      }
    }

    return keywords.length === 1 && !this.isKnowledgeQuery(query) && !this.hasPersonalPronoun(query)
  }
}

/**
 * Global intent classifier instance
 */
let globalClassifier: IntentClassifier | null = null

/**
 * Get or create the global intent classifier
 */
export function getIntentClassifier(): IntentClassifier {
  if (!globalClassifier) {
    globalClassifier = new IntentClassifier()
  }
  return globalClassifier
}

/**
 * Convenience function to classify intent
 */
export function classifyIntent(query: string, entities?: ExtractedEntities): IntentClassification {
  return getIntentClassifier().classify(query, entities)
}
