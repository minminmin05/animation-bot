/**
 * Intent Types and Classification
 *
 * Simplified intent classification with clear separation from actions.
 */

/**
 * Intent types
 */
export enum Intent {
  /** Search knowledge base (RAG) */
  KNOWLEDGE = 'knowledge',

  /** Query personal/specific data (requires authorization) */
  PERSONAL_DATA = 'personal_data',

  /** Query for lists, counts, statistics */
  DATABASE_QUERY = 'database_query',

  /** User needs to clarify intent */
  AMBIGUOUS = 'ambiguous',

  /** Not school-related or unclear */
  UNKNOWN = 'unknown'
}

/**
 * Intent classification result
 */
export interface IntentClassification {
  intent: Intent
  confidence: number
  reasoning: string
  clarificationQuestion?: string
}

/**
 * Intent classification options
 */
export interface IntentClassificationOptions {
  useLLMFallback?: boolean
  minConfidence?: number
}

/**
 * Intent classifier interface
 */
export interface IIntentClassifier {
  classify(query: string, entities?: any): IntentClassification
  classifyWithNormalization(normalizedQuery: string, entities?: any): IntentClassification
}

/**
 * Get clarification question based on query
 */
export function getClarificationQuestion(query: string, language: 'th' | 'en' = 'th'): string {
  const q = query.toLowerCase()

  if (language === 'th' || /[ก-ฮ]/.test(query)) {
    // Thai clarification
    if (/เกรด|คะแนน|สอบ/.test(q)) {
      return 'คุณต้องการถามเกี่ยวกับ "วิธีการคำนวณเกรด" หรือ "เกรดของคุณเอง"?'
    }
    if (/การมาเรียน|มาสาย|ขาด/.test(q)) {
      return 'คุณต้องการถามเกี่ยวกับ "กฎการมาเรียน" หรือ "สถิติการมาเรียนของคุณ"?'
    }
    if (/ตารางเรียน|คาบ/.test(q)) {
      return 'คุณต้องการถามเกี่ยวกับ "ตารางเรียนของคุณ" หรือ "ตารางสอบ"?'
    }
    return `คุณต้องการถามเกี่ยวกับ "${query}" ในเชิงทั่วไป หรือข้อมูลส่วนตัวของคุณ?`
  }

  // English clarification
  if (/grade|score|gpa/.test(q)) {
    return 'Are you asking about "how grades work" or "your own grades"?'
  }
  if (/attendance|absent|present/.test(q)) {
    return 'Are you asking about "attendance policies" or "your attendance record"?'
  }
  if (/class|schedule|subject/.test(q)) {
    return 'Are you asking about "course information" or "your personal schedule"?'
  }
  return `Are you asking about "${query}" in general, or specifically about your own situation?`
}

/**
 * Map string to Intent enum
 */
export function parseIntent(intentStr: string): Intent {
  const upper = intentStr.toUpperCase()
  if (Object.values(Intent).includes(upper as Intent)) {
    return upper as Intent
  }
  return Intent.UNKNOWN
}

/**
 * Check if intent requires database access
 */
export function requiresDatabaseAccess(intent: Intent): boolean {
  return intent === Intent.PERSONAL_DATA || intent === Intent.DATABASE_QUERY
}

/**
 * Check if intent requires authorization
 */
export function requiresAuthorization(intent: Intent): boolean {
  return intent === Intent.PERSONAL_DATA
}
