/**
 * Action Types and Resolution
 *
 * Defines actions that can be performed and the resolution logic.
 */

import { Intent } from './intent.types.js'
import { ExtractedEntities } from '../entities/entity.types.js'

/**
 * Actions that the system can perform
 */
export enum Action {
  GET_STUDENT_PROFILE = 'GET_STUDENT_PROFILE',
  GET_SCHEDULE = 'GET_SCHEDULE',
  GET_GRADES = 'GET_GRADES',
  GET_ATTENDANCE = 'GET_ATTENDANCE',
  GET_PAYMENTS = 'GET_PAYMENTS',
  GET_DISCIPLINE = 'GET_DISCIPLINE',
  GET_STUDENT_COUNT = 'GET_STUDENT_COUNT',
  GET_TEACHER_COUNT = 'GET_TEACHER_COUNT',
  GET_CLASS_COUNT = 'GET_CLASS_COUNT',
  GET_STATISTICS = 'GET_STATISTICS',
  SEARCH_KNOWLEDGE = 'SEARCH_KNOWLEDGE'
}

/**
 * Action resolution result
 */
export interface ActionResolution {
  action: Action
  confidence: number
  reasoning: string
  matchedKeywords?: string[]
}

/**
 * Action pattern definition
 */
interface ActionPattern {
  keywords: string[]
  priority: number
}

/**
 * Action pattern mappings
 */
const ACTION_PATTERNS: Map<Action, ActionPattern[]> = new Map([
  // Grades actions
  [Action.GET_GRADES, [
    { keywords: ['เกรด', 'คะแนน', 'grade', 'score', 'scores', 'gpa'], priority: 10 },
    { keywords: ['ผลการเรียน', 'ผลสอบ'], priority: 9 }
  ]],

  // Schedule actions
  [Action.GET_SCHEDULE, [
    { keywords: ['ตารางเรียน', 'ตาราง', 'คาบเรียน', 'schedule', 'timetable'], priority: 10 }
  ]],

  // Attendance actions
  [Action.GET_ATTENDANCE, [
    { keywords: ['การมาเรียน', 'มาสาย', 'ขาดเรียน', 'ลา', 'attendance', 'absent'], priority: 10 }
  ]],

  // Payment actions
  [Action.GET_PAYMENTS, [
    { keywords: ['ค่าเทอม', 'ค่าใช้จ่าย', 'ค่าเล่าเรียน', 'ชำระ', 'payment', 'tuition', 'fee'], priority: 10 }
  ]],

  // Discipline actions
  [Action.GET_DISCIPLINE, [
    { keywords: ['วินัย', 'ทำโทษ', 'ระงับ', 'ความประพฤติ', 'discipline', 'punishment'], priority: 10 }
  ]],

  // Student profile actions
  [Action.GET_STUDENT_PROFILE, [
    { keywords: ['ข้อมูลนักเรียน', 'profile', 'information'], priority: 8 }
  ]],

  // Statistics actions
  [Action.GET_STATISTICS, [
    { keywords: ['สถิติ', 'statistics', 'average', 'mean'], priority: 9 }
  ]]
])

/**
 * Count action patterns
 */
const COUNT_PATTERNS = [
  'มี.*กี่',
  'จำนวน.*ทั้งหมด',
  'รายชื่อ',
  'how many',
  'count',
  'total'
]

/**
 * Resolve action based on intent, query, and entities
 */
export function resolveAction(
  normalizedQuery: string,
  intent: Intent,
  entities: ExtractedEntities
): ActionResolution {
  console.log(`[ActionResolver] Intent: ${intent}, Query: "${normalizedQuery}"`)

  // For KNOWLEDGE intent, always return SEARCH_KNOWLEDGE
  if (intent === Intent.KNOWLEDGE) {
    console.log('[ActionResolver] → SEARCH_KNOWLEDGE (knowledge intent)')
    return {
      action: Action.SEARCH_KNOWLEDGE,
      confidence: 0.9,
      reasoning: 'Knowledge intent mapped to RAG search'
    }
  }

  // For DATABASE_QUERY, check if it's a count/statistics query
  if (intent === Intent.DATABASE_QUERY) {
    if (isCountQuery(normalizedQuery)) {
      console.log('[ActionResolver] → GET_STATISTICS (count pattern)')
      return {
        action: Action.GET_STATISTICS,
        confidence: 0.95,
        reasoning: 'Count/statistics query pattern detected'
      }
    }

    // Check what entity is being counted
    if (/นักเรียน|student/.test(normalizedQuery)) {
      return {
        action: Action.GET_STUDENT_COUNT,
        confidence: 0.9,
        reasoning: 'Student count query'
      }
    }

    if (/ครู|teacher/.test(normalizedQuery)) {
      return {
        action: Action.GET_TEACHER_COUNT,
        confidence: 0.9,
        reasoning: 'Teacher count query'
      }
    }

    if (/ห้อง|class/.test(normalizedQuery)) {
      return {
        action: Action.GET_CLASS_COUNT,
        confidence: 0.9,
        reasoning: 'Class count query'
      }
    }
  }

  // For PERSONAL_DATA, resolve based on keywords and entities
  if (intent === Intent.PERSONAL_DATA) {
    return resolvePersonalDataAction(normalizedQuery, entities)
  }

  // For AMBIGUOUS, default to SEARCH_KNOWLEDGE (will ask for clarification)
  if (intent === Intent.AMBIGUOUS) {
    console.log('[ActionResolver] → SEARCH_KNOWLEDGE (ambiguous, will clarify)')
    return {
      action: Action.SEARCH_KNOWLEDGE,
      confidence: 0.5,
      reasoning: 'Ambiguous intent, will ask clarification'
    }
  }

  // Default fallback
  console.log('[ActionResolver] → SEARCH_KNOWLEDGE (default)')
  return {
    action: Action.SEARCH_KNOWLEDGE,
    confidence: 0.5,
    reasoning: 'Default action'
  }
}

/**
 * Resolve action for personal data queries
 */
function resolvePersonalDataAction(
  query: string,
  entities: ExtractedEntities
): ActionResolution {
  const scores = new Map<Action, number>()
  const matchedKeywords: string[] = []

  // Score each action based on keyword matches
  for (const [action, patterns] of ACTION_PATTERNS) {
    let score = 0
    for (const pattern of patterns) {
      for (const keyword of pattern.keywords) {
        if (query.includes(keyword)) {
          score += pattern.priority
          matchedKeywords.push(keyword)
        }
      }
    }
    if (score > 0) {
      scores.set(action, score)
    }
  }

  // Return highest scoring action
  if (scores.size > 0) {
    const [action, score] = [...scores.entries()].sort((a, b) => b[1] - a[1])[0]
    console.log(`[ActionResolver] → ${action} (score: ${score})`)
    return {
      action,
      confidence: Math.min(score / 20, 0.95),
      reasoning: `Keyword match (score: ${score})`,
      matchedKeywords
    }
  }

  // Default to student profile if a person is mentioned
  if (entities.people && entities.people.length > 0) {
    console.log(`[ActionResolver] → GET_STUDENT_PROFILE (person: "${entities.people[0]}")`)
    return {
      action: Action.GET_STUDENT_PROFILE,
      confidence: 0.7,
      reasoning: `Person name detected, assuming profile request`
    }
  }

  console.log('[ActionResolver] → SEARCH_KNOWLEDGE (personal data default)')
  return {
    action: Action.SEARCH_KNOWLEDGE,
    confidence: 0.5,
    reasoning: 'No specific personal data action matched'
  }
}

/**
 * Check if query is a count/statistics query
 */
function isCountQuery(query: string): boolean {
  const lower = query.toLowerCase()
  return COUNT_PATTERNS.some(pattern => {
    if (pattern.includes('|')) {
      return new RegExp(pattern, 'i').test(lower)
    }
    return lower.includes(pattern)
  })
}

/**
 * Action resolver service class
 */
export class ActionResolver {
  /**
   * Resolve action based on intent, query, and entities
   */
  resolve(
    normalizedQuery: string,
    intent: Intent,
    entities: ExtractedEntities
  ): ActionResolution {
    return resolveAction(normalizedQuery, intent, entities)
  }
}

/**
 * Global action resolver instance
 */
let globalResolver: ActionResolver | null = null

/**
 * Get or create the global action resolver
 */
export function getActionResolver(): ActionResolver {
  if (!globalResolver) {
    globalResolver = new ActionResolver()
  }
  return globalResolver
}

/**
 * Convenience function to resolve action
 */
export function resolveActionFromQuery(
  normalizedQuery: string,
  intent: Intent,
  entities: ExtractedEntities
): ActionResolution {
  return getActionResolver().resolve(normalizedQuery, intent, entities)
}
