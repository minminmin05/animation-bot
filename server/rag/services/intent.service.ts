/**
 * Enhanced Intent Classification Service
 * Features:
 * - Keyword-based fast routing (deterministic)
 * - Entity detection (names, student IDs, etc.)
 * - Confidence recovery logic
 * - Detailed logging for debugging
 * - Support for Thai and English
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp'

// ============================================================
// INTENT ENUMS
// ============================================================

export enum Intent {
  KNOWLEDGE = 'knowledge',         // Policies, rules, general info → use RAG
  PERSONAL_DATA = 'personal_data', // Grades, attendance, personal info → use secure DB query
  DATABASE_QUERY = 'database_query', // List queries, statistics → use DB
  AMBIGUOUS = 'ambiguous',         // Could be either → ask clarification
  UNKNOWN = 'unknown'              // Not school-related or unclear
}

// ============================================================
// TYPES
// ============================================================

export interface IntentClassification {
  intent: Intent
  confidence: number
  reasoning: string
  suggestedAction: string
  needsLLMFallback?: boolean
  clarificationQuestion?: string
  // New fields for improved debugging
  matchedKeywords?: string[]
  detectedEntities?: Entity[]
  confidenceAdjustment?: number
  routingReason?: string
}

export interface UserContext {
  userId?: string
  role?: 'student' | 'teacher' | 'parent' | 'admin'
  studentId?: string
  teacherId?: string
}

export interface Entity {
  type: 'person_name' | 'student_id' | 'teacher_id' | 'room_number' | 'subject' | 'class_name' | 'grade_level'
  value: string
  confidence: number
}

// ============================================================
// KEYWORD-BASED FAST ROUTING
// ============================================================

/**
 * Thai school-related keywords - strong indicators for school domain
 * If ANY of these are present, route to RAG_SEARCH or DATABASE_QUERY
 */
const THAI_SCHOOL_KEYWORDS = [
  // People
  'นักเรียน', 'นร.', 'นักเรียนทั้งหมด', 'รายชื่อนักเรียน',
  'ครู', 'อาจารย์', 'ผู้สอน', 'ครูทั้งหมด', 'รายชื่อครู',
  'ผู้ปกครอง', 'พ่อแม่',
  'ผู้บริหาร', 'ผู้อำนวยการ', 'ฝ่าย',
  'พนักงาน', 'บุคลากร',

  // Academic
  'ห้องเรียน', 'ห้อง', 'คลาส', 'ชั้นเรียน', 'กลุ่ม',
  'วิชา', 'เรียน', 'สอน', 'บทเรียน', 'หลักสูตร',
  'เกรด', 'คะแนน', 'ผลการเรียน', 'วิทยาฐานะ',
  'สอบ', 'ปลายภาค', 'กลางภาค', 'สอบไล่', 'สอบแก้ตัว',
  'ตารางสอบ', 'ตารางเรียน', 'ตาราง',

  // Attendance/Discipline
  'การมาเรียน', 'มาสาย', 'ขาดเรียน', 'ลา', 'ลาป่วย', 'ลากิจ',
  'มาเรียน', 'เข้าเรียน',
  'ทำโทษ', 'ระงับ', 'แจ้งความดี', 'ความประพฤติ',

  // Enrollment/Admin
  'สมัคร', 'ลงทะเบียน', 'ย้าย', 'ย้ายโรงเรียน',
  'จบการศึกษา', 'สำเร็จการศึกษา', 'ประกาศนียบัตร',
  'ประกาศ', 'กฎ', 'กติกา', 'ระเบียบ', 'ข้อบังคับ',
  'ค่าเทอม', 'ค่าธรรมเนียม', 'เงิน',

  // Facilities/Services
  'ห้องสมุด', 'โรงอาหาร', 'กิจกรรม', 'ชมรม',
  'รถรับส่ง', 'รถโรงเรียน', 'รถบัส',
  'ห้องพยาบาล', 'กายภาพ',

  // Documents
  'เอกสาร', 'ใบรับรอง', 'ทรานสคริปต์', 'ใบ ปพ.1', 'ใบ ปพ.7',
  'ใบลา', 'หนังสือรับรอง',

  // Common question words (when combined with school context)
  'ขอข้อมูล', 'ขอดู', 'อยากรู้', 'อยากทราบ', 'ถามว่า',
  'มีไหม', 'มีหรือไม่', 'มีกี่', 'จำนวน', 'ทั้งหมด',
  'รายชื่อ', 'ชื่อ', 'ใคร',

  // Account/Tech
  'รหัสผ่าน', 'พาสเวิร์ด', 'username', 'password',
  'เข้าสู่ระบบ', 'login', 'ล็อกอิน', 'สมัครสมาชิก',
  'แอพ', 'แอป', 'ระบบ', 'เว็บ',
]

/**
 * English school-related keywords
 */
const ENGLISH_SCHOOL_KEYWORDS = [
  // People
  'student', 'students', 'pupil', 'learners',
  'teacher', 'teachers', 'instructor', 'professor', 'staff',
  'parent', 'guardian', 'father', 'mother',
  'principal', 'director', 'admin', 'administration',

  // Academic
  'class', 'classes', 'classroom', 'lesson', 'course', 'subject',
  'grade', 'grades', 'score', 'scores', 'mark', 'marks', 'gpa', 'result',
  'exam', 'exams', 'test', 'tests', 'quiz', 'final', 'midterm',
  'schedule', 'timetable', 'calendar',

  // Attendance/Discipline
  'attendance', 'absent', 'absence', 'late', 'present',
  'disciplinary', 'discipline', 'punishment', 'suspension', 'warning',

  // Enrollment/Admin
  'enroll', 'enrollment', 'register', 'registration', 'admission',
  'graduate', 'graduation', 'diploma', 'certificate', 'transcript',
  'policy', 'policies', 'rule', 'rules', 'regulation',
  'tuition', 'fee', 'fees', 'payment',

  // Facilities/Services
  'library', 'cafeteria', 'canteen', 'activity', 'club',
  'bus', 'transport', 'transportation',
  'nurse', 'clinic', 'infirmary',

  // Documents
  'document', 'documents', 'certificate', 'transcript',
  'form', 'forms', 'application',

  // Common question words
  'information', 'info', 'data',
  'list', 'show', 'display', 'all', 'how many', 'count',
  'who', 'what', 'where', 'when', 'how',

  // Account/Tech
  'password', 'account', 'login', 'signin', 'register', 'username',
  'app', 'application', 'system', 'website', 'portal',
]

/**
 * Personal pronouns - indicate PERSONAL_DATA intent
 */
const PERSONAL_PRONOUNNS = {
  thai: ['ฉัน', 'ผม', 'ดิฉัน', 'ของฉัน', 'ของผม', 'ตัวฉัน', 'ตัวผม', 'เรา'],
  english: ['my', 'mine', 'me', 'i', 'i am', 'i have', 'i need', 'i want']
}

/**
 * Knowledge query indicators (NOT personal)
 */
const KNOWLEDGE_INDICATORS = [
  // Thai
  /คืออะไร/, /อย่างไร/, /ทำอย่างไร/, /วิธี/, /กฎ/, /กติกา/, /ระเบียบ/, /นโยบาย/,
  /ประกาศ/, /แจ้ง/, /ประชาสัมพันธ์/, /faq/, /ถาม-ตอบ/,
  // English
  /\bwhat is\b/, /\bhow to\b/, /\bhow do\b/, /\bhow does\b/, /\bpolicy\b/, /\brule\b/,
]

// ============================================================
// ENTITY DETECTION PATTERNS
// ============================================================

/**
 * Detect person names (Thai and English)
 * Thai: Start with capital letter, 2+ characters
 * English: First + Last name pattern
 */
const PERSON_NAME_PATTERNS = [
  // Thai name pattern: ชื่อ-นามสกุล (2-3 words, starts with Thai consonant)
  /(?:[ก-ฮ][ก-�็ัิ-ฺ]{1,5}\s+){1,2}[ก-ฮ][ก-๊็ิ-ืฺ]{1,10}/,
  // English name pattern: First Last (2+ words, starts with capital)
  /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/,
  // Full name with middle: First Middle Last
  /\b[A-Z][a-z]+\s+[A-Z]\.?\s+[A-Z][a-z]+\b/,
]

/**
 * Student ID patterns (Thai schools)
 */
const STUDENT_ID_PATTERNS = [
  // Generic numeric ID: 6-10 digits
  /\b\d{6,10}\b/,
  // ID with prefix
  /[A-Z]{1,3}\d{4,8}/,
  // Thai school format
  /\d{4}-\d{4}/,
]

/**
 * Teacher ID patterns
 */
const TEACHER_ID_PATTERNS = [
  /T\d{4,6}/i,
  /teacher[_-]?\d+/i,
  /ครู[_-]?\d+/,
]

/**
 * Room/Class patterns
 */
const ROOM_PATTERNS = [
  // Thai format: ม.1/1, ม.2/3, etc. (with or without spaces)
  /\bม\.?\s*[\d\/]+/,
  /[ก-๛]\.?\s*[\d\/]+/, // Thai letter + . + number
  // English: Grade 1, Class A, Room 101
  /\b(?:grade|class|room)\s*\d+/i,
  // Room number: 3 digits
  /\b\d{3}\b/,
  /ห้อง\s*\d+/,
]

/**
 * Subject patterns
 */
const SUBJECT_PATTERNS = [
  // Thai subjects
  /คณิตศาสตร์|วิทยาศาสตร์|ภาษาไทย|ภาษาอังกฤษ|สังคม|ศิลปะ|การงาน|พลศึกษา|ประวัติศาสตร์|ภูมิศาสตร์|ชีววิทยา|เคมี|ฟิสิกส์/,
  // English subjects
  /math|english|science|history|geography|biology|chemistry|physics|art|music|pe|physical education/i,
]

// ============================================================
// ENTITY DETECTION FUNCTIONS
// ============================================================

/**
 * Extract entities from query
 */
function detectEntities(query: string): Entity[] {
  const entities: Entity[] = []
  const q = query

  // Detect person names
  for (const pattern of PERSON_NAME_PATTERNS) {
    const matches = q.match(pattern)
    if (matches) {
      for (const match of matches) {
        if (!entities.some(e => e.value === match)) {
          entities.push({
            type: 'person_name',
            value: match,
            confidence: 0.85
          })
        }
      }
    }
  }

  // Detect student IDs
  for (const pattern of STUDENT_ID_PATTERNS) {
    const matches = q.match(pattern)
    if (matches) {
      for (const match of matches) {
        // Exclude if it's a room number (3 digits)
        if (!/^\d{3}$/.test(match) && !entities.some(e => e.value === match)) {
          entities.push({
            type: 'student_id',
            value: match,
            confidence: 0.9
          })
        }
      }
    }
  }

  // Detect teacher IDs
  for (const pattern of TEACHER_ID_PATTERNS) {
    const matches = q.match(pattern)
    if (matches) {
      for (const match of matches) {
        if (!entities.some(e => e.value === match)) {
          entities.push({
            type: 'teacher_id',
            value: match,
            confidence: 0.95
          })
        }
      }
    }
  }

  // Detect rooms/classes
  for (const pattern of ROOM_PATTERNS) {
    const matches = q.match(pattern)
    if (matches) {
      for (const match of matches) {
        if (!entities.some(e => e.value === match)) {
          entities.push({
            type: 'room_number',
            value: match,
            confidence: 0.8
          })
        }
      }
    }
  }

  // Detect subjects
  for (const pattern of SUBJECT_PATTERNS) {
    const matches = q.match(pattern)
    if (matches) {
      for (const match of matches) {
        if (!entities.some(e => e.value === match)) {
          entities.push({
            type: 'subject',
            value: match,
            confidence: 0.85
          })
        }
      }
    }
  }

  return entities
}

// ============================================================
// KEYWORD DETECTION FUNCTIONS
// ============================================================

/**
 * Detect school-related keywords in query
 */
function detectSchoolKeywords(query: string): { thai: string[]; english: string[]; all: string[] } {
  const q = query.toLowerCase()
  const thai: string[] = []
  const english: string[] = []

  for (const keyword of THAI_SCHOOL_KEYWORDS) {
    if (q.includes(keyword.toLowerCase())) {
      thai.push(keyword)
    }
  }

  for (const keyword of ENGLISH_SCHOOL_KEYWORDS) {
    if (q.includes(keyword.toLowerCase())) {
      english.push(keyword)
    }
  }

  return { thai, english, all: [...thai, ...english] }
}

/**
 * Check if query contains personal pronouns
 */
function hasPersonalPronouns(query: string): boolean {
  const q = query.toLowerCase()

  // Check Thai pronouns
  for (const pronoun of PERSONAL_PRONOUNNS.thai) {
    if (q.includes(pronoun)) return true
  }

  // Check English pronouns (use word boundaries for accuracy)
  for (const pronoun of PERSONAL_PRONOUNNS.english) {
    const pattern = new RegExp(`\\b${pronoun}\\b`, 'i')
    if (pattern.test(q)) return true
  }

  return false
}

/**
 * Check if query is a knowledge query (not personal)
 */
function isKnowledgeQuery(query: string): boolean {
  const q = query.toLowerCase()
  for (const pattern of KNOWLEDGE_INDICATORS) {
    if (pattern.test(q)) return true
  }
  return false
}

/**
 * Check if query is a list/statistics query
 */
function isListQuery(query: string): boolean {
  const q = query.toLowerCase()
  const listPatterns = [
    /มี.*กี่/,
    /จำนวน.*ทั้งหมด/,
    /รายชื่อ/,
    /ทั้งหมด.*มี/,
    /list\s+(all\s+)?/,
    /show\s+all/,
    /how\s+many/i,
    /count/i,
    /who\s+(are|is)/i,
  ]
  return listPatterns.some(p => p.test(q))
}

// ============================================================
// INTENT PATTERNS (LEGACY - FOR REFERENCE)
// ============================================================

const INTENT_PATTERNS = {
  [Intent.KNOWLEDGE]: [
    /policy|policies|rule|rules|regulation|guideline/i,
    /dress code|uniform|เครื่องแบบ/i,
    /grading (scale|system|policy)/,
    /how (do|to|can|does).*(apply|register|enroll)/i,
    /กฎ|กติกา|ระเบียบ|นโยบาย|ประกาศ/,
    /คือ(อะไร|อย่างไร)/,
    /วิธี(ลงทะเบียน|เรียน|ทำ)/,
  ],
  [Intent.PERSONAL_DATA]: [
    /\bmy\s+(grades?|scores?|gpa|attendance)\b/i,
    /เกรดของฉัน|คะแนนของฉัน|ผลการเรียนของฉัน/,
    /การมาเรียนของฉัน|ตารางเรียนของฉัน/,
  ]
}

// ============================================================
// CONFIDENCE RECOVERY LOGIC
// ============================================================

/**
 * Calculate adjusted confidence with keyword/entity boost
 */
function calculateAdjustedConfidence(
  baseConfidence: number,
  keywords: string[],
  entities: Entity[],
  isList: boolean,
  isKnowledge: boolean
): { confidence: number; adjustment: number; reason: string } {
  let confidence = baseConfidence
  let adjustment = 0
  const reasons: string[] = []

  // Confidence is too low - apply recovery
  if (baseConfidence < 0.5) {
    // Strong boost for school keywords
    if (keywords.length >= 2) {
      const boost = 0.3
      confidence += boost
      adjustment += boost
      reasons.push(`${keywords.length} school keywords detected`)
    } else if (keywords.length === 1) {
      const boost = 0.2
      confidence += boost
      adjustment += boost
      reasons.push(`school keyword detected: "${keywords[0]}"`)
    }

    // Boost for entity detection
    if (entities.length > 0) {
      const boost = Math.min(entities.length * 0.1, 0.25)
      confidence += boost
      adjustment += boost
      reasons.push(`${entities.length} entity(s) detected`)
    }

    // Boost for list/statistics queries
    if (isList) {
      const boost = 0.35
      confidence += boost
      adjustment += boost
      reasons.push('list/statistics query pattern')
    }

    // Boost for knowledge indicators
    if (isKnowledge) {
      const boost = 0.25
      confidence += boost
      adjustment += boost
      reasons.push('knowledge query indicator')
    }
  }

  // Cap confidence at 0.95
  confidence = Math.min(confidence, 0.95)

  return {
    confidence,
    adjustment,
    reason: reasons.join(', ') || 'no adjustment'
  }
}

// ============================================================
// CONSTANTS
// ============================================================

export const LLM_FALLBACK_THRESHOLD = 0.5
const AMBIGUOUS_CONFIDENCE_DIFF = 0.15

// ============================================================
// MAIN CLASSIFICATION FUNCTION
// ============================================================

/**
 * Enhanced intent classification with keyword-based routing and entity detection
 */
export function classifyIntent(
  question: string,
  userContext?: UserContext
): IntentClassification {
  const q = question.toLowerCase().trim()
  const originalQ = question

  console.log(`\n[Intent] ==================== CLASSIFICATION START ====================`)
  console.log(`[Intent] Query: "${originalQ}"`)

  // ============================================================
  // STEP 1: KEYWORD DETECTION (FAST PATH)
  // ============================================================

  const keywords = detectSchoolKeywords(originalQ)
  console.log(`[Intent] Keywords detected: ${keywords.all.length > 0 ? keywords.all.join(', ') : 'none'}`)

  // ============================================================
  // STEP 2: ENTITY DETECTION
  // ============================================================

  const entities = detectEntities(originalQ)
  if (entities.length > 0) {
    console.log(`[Intent] Entities detected:`)
    entities.forEach(e => {
      console.log(`[Intent]   - ${e.type}: "${e.value}" (confidence: ${e.confidence})`)
    })
  }

  // ============================================================
  // STEP 3: ADMIN QUERY DETECTION (name + data keyword)
  // ============================================================

  const hasPersonName = entities.some(e => e.type === 'person_name')
  // Expanded list of data keywords for admin queries
  const hasDataKeyword = /(เกรด|คะแนน|ผลสอบ|การมาเรียน|การเข้าเรียน|เข้าเรียน|ขาด|มาสาย|ลา|ตารางเรียน|ตารางสอบ|ค่าเทอม|ค่าเล่าเรียน|ชำระ|พฤติกรรม|ทำโทษ|วินัย|ประวัติ|ข้อมูล|grade|score|attendance|schedule|timetable|tuition|payment|fee|discipline|behavior|profile|information|data)/i.test(q)
  const isAdminQuery = hasPersonName && hasDataKeyword && !hasPersonalPronouns(q)

  if (isAdminQuery) {
    const personName = entities.find(e => e.type === 'person_name')?.value || 'Unknown'
    console.log(`[Intent] ✓ Admin query detected for person: "${personName}"`)

    return {
      intent: Intent.PERSONAL_DATA,
      confidence: 0.95,
      reasoning: `Admin query for student "${personName}" with data keyword`,
      suggestedAction: userContext?.userId
        ? `Fetch personal data for "${personName}"`
        : 'Authentication required for personal data access',
      matchedKeywords: keywords.all,
      detectedEntities: entities,
      routingReason: 'Admin query: person name + data keyword'
    }
  }

  // ============================================================
  // STEP 4: LIST/STATISTICS QUERY DETECTION
  // ============================================================

  const isList = isListQuery(originalQ)
  if (isList) {
    console.log(`[Intent] ✓ List/Statistics query detected`)

    return {
      intent: Intent.DATABASE_QUERY,
      confidence: 0.9,
      reasoning: 'Query asks for list or count of items',
      suggestedAction: 'Query database for list/count',
      matchedKeywords: keywords.all,
      detectedEntities: entities,
      routingReason: 'List/statistics pattern detected'
    }
  }

  // ============================================================
  // STEP 5: PERSONAL vs KNOWLEDGE CLASSIFICATION
  // ============================================================

  const hasPersonalPronoun = hasPersonalPronouns(q)
  const isKnowledge = isKnowledgeQuery(q)

  console.log(`[Intent] Personal pronouns: ${hasPersonalPronoun ? 'yes' : 'no'}`)
  console.log(`[Intent] Knowledge indicator: ${isKnowledge ? 'yes' : 'no'}`)

  let intent: Intent
  let baseConfidence: number
  let reasoning: string

  // PERSONAL_DATA: Has personal pronouns AND school keywords
  if (hasPersonalPronoun && keywords.all.length > 0) {
    intent = Intent.PERSONAL_DATA
    baseConfidence = 0.8
    reasoning = `Personal pronoun detected with ${keywords.all.length} school keyword(s)`

    console.log(`[Intent] → PERSONAL_DATA (pronoun + school keywords)`)
  }
  // KNOWLEDGE: Knowledge indicators OR school keywords without personal pronouns
  else if (isKnowledge || (keywords.all.length > 0 && !hasPersonalPronoun)) {
    intent = Intent.KNOWLEDGE
    baseConfidence = isKnowledge ? 0.85 : 0.7
    reasoning = isKnowledge
      ? 'Knowledge query pattern detected'
      : `School keywords detected without personal pronouns`

    console.log(`[Intent] → KNOWLEDGE (${isKnowledge ? 'pattern' : 'keywords only'})`)
  }
  // AMBIGUOUS: Single keyword or school term without context
  else if (keywords.all.length === 1 && !hasPersonalPronoun && !isKnowledge) {
    intent = Intent.AMBIGUOUS
    baseConfidence = 0.4
    reasoning = `Single school keyword "${keywords.all[0]}" without clear context`

    console.log(`[Intent] → AMBIGUOUS (single keyword without context)`)
  }
  // PERSON_NAME_ONLY: Just a person name without context - treat as PERSONAL_DATA
  else if (hasPersonName && !hasPersonalPronoun && keywords.all.length === 0) {
    intent = Intent.PERSONAL_DATA
    baseConfidence = 0.65
    reasoning = `Person name detected ("${entities.find(e => e.type === 'person_name')?.value}"), assuming student profile request`

    console.log(`[Intent] → PERSONAL_DATA (person name only, defaulting to profile)`)
  }
  // UNKNOWN: No school keywords detected
  else {
    intent = Intent.UNKNOWN
    baseConfidence = 0.2
    reasoning = 'No school-related keywords detected'

    console.log(`[Intent] → UNKNOWN (no school keywords)`)
  }

  // ============================================================
  // STEP 6: CONFIDENCE RECOVERY
  // ============================================================

  const adjusted = calculateAdjustedConfidence(baseConfidence, keywords.all, entities, isList, isKnowledge)

  console.log(`[Intent] Confidence: ${baseConfidence.toFixed(2)} → ${adjusted.confidence.toFixed(2)} (${adjusted.reason})`)

  // ============================================================
  // STEP 7: DETERMINED ROUTING
  // ============================================================

  let finalIntent = intent
  let finalConfidence = adjusted.confidence

  // Final routing logic
  let routingAction: string
  let needsFallback = finalConfidence < LLM_FALLBACK_THRESHOLD

  // If we have school keywords/entities but low confidence, route to RAG_SEARCH
  if (needsFallback && (keywords.all.length > 0 || entities.length > 0)) {
    console.log(`[Intent] ⚠ Confidence recovery triggered: boosting to RAG_SEARCH`)

    if (intent === Intent.PERSONAL_DATA) {
      routingAction = userContext?.userId ? 'DB_QUERY_SECURE' : 'AUTH_REQUIRED'
    } else if (intent === Intent.UNKNOWN && keywords.all.length > 0) {
      // Unknown intent but has school keywords - treat as KNOWLEDGE
      finalIntent = Intent.KNOWLEDGE
      finalConfidence = 0.65
      routingAction = 'RAG_SEARCH'
      needsFallback = false
    } else {
      routingAction = 'RAG_SEARCH'
    }
  } else {
    routingAction = getRoutingAction(intent, !!userContext?.userId)
  }

  console.log(`[Intent] Routing: ${routingAction}`)
  console.log(`[Intent] ==================== CLASSIFICATION END ====================\n`)

  // ============================================================
  // STEP 8: BUILD RESPONSE
  // ============================================================

  const result: IntentClassification = {
    intent: finalIntent,
    confidence: finalConfidence,
    reasoning: adjusted.reason ? `${reasoning} (${adjusted.reason})` : reasoning,
    suggestedAction: getSuggestedAction(finalIntent, routingAction, userContext),
    needsLLMFallback: needsFallback,
    matchedKeywords: keywords.all,
    detectedEntities: entities,
    confidenceAdjustment: adjusted.adjustment,
    routingReason: routingAction
  }

  // Add clarification for ambiguous
  if (finalIntent === Intent.AMBIGUOUS) {
    result.clarificationQuestion = getClarificationQuestion(originalQ)
  }

  return result
}

/**
 * Get suggested action based on intent and routing
 */
function getSuggestedAction(intent: Intent, routing: string, userContext?: UserContext): string {
  switch (intent) {
    case Intent.PERSONAL_DATA:
      return userContext?.userId ? 'Query database for personal data' : 'Authentication required'
    case Intent.DATABASE_QUERY:
      return 'Query database for list/statistics'
    case Intent.KNOWLEDGE:
      return 'Search RAG knowledge base'
    case Intent.AMBIGUOUS:
      return 'Ask user to clarify'
    case Intent.UNKNOWN:
      return routing === 'RAG_SEARCH' ? 'Search knowledge base as fallback' : 'Ask for clarification'
    default:
      return 'Unknown action'
  }
}

/**
 * Get clarification question for ambiguous queries
 */
function getClarificationQuestion(question: string): string {
  const q = question.toLowerCase()

  // Thai clarification
  if (/[ก-ฮ]/.test(question)) {
    if (/เกรด|คะแนน|สอบ/.test(q)) {
      return 'คุณต้องการถามเกี่ยวกับ "วิธีการคำนวณเกรด" หรือ "เกรดของคุณเอง"?'
    }
    if (/การมาเรียน|มาสาย|ขาด/.test(q)) {
      return 'คุณต้องการถามเกี่ยวกับ "กฎการมาเรียน" หรือ "สถิติการมาเรียนของคุณ"?'
    }
    return `คุณต้องการถามเกี่ยวกับ "${question}" ในเชิงทั่วไป หรือข้อมูลส่วนตัวของคุณ?`
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
  return `Are you asking about "${question}" in general, or specifically about your own situation?`
}

// ============================================================
// HYBRID CLASSIFICATION (with LLM fallback)
// ============================================================

/**
 * Hybrid classification: pattern match first, use LLM if confidence is low
 */
export async function classifyIntentHybrid(
  question: string,
  userContext?: UserContext,
  forceLLM = false
): Promise<IntentClassification> {
  // First, try pattern matching
  const patternResult = classifyIntent(question, userContext)

  // If confidence is high enough or LLM is disabled, return pattern result
  if (!forceLLM && patternResult.confidence >= LLM_FALLBACK_THRESHOLD) {
    return patternResult
  }

  // Low confidence - use LLM for better accuracy
  console.log(`[Intent] Low confidence (${patternResult.confidence.toFixed(2)}), using LLM fallback`)
  return await classifyIntentWithLLM(question, userContext, patternResult)
}

/**
 * LLM-based classification (fallback)
 */
export async function classifyIntentWithLLM(
  question: string,
  userContext?: UserContext,
  patternResult?: IntentClassification
): Promise<IntentClassification> {
  try {
    const prompt = `You are an intent classifier for a school management AI assistant.

Classify the user's query into ONE of these categories:

1. KNOWLEDGE - General information, policies, rules, FAQs, explanations
   Examples: "What is the dress code?", "How do I register?", "When is spring break?"
   Thai: "กฎเครื่องแบบคืออะไร", "เกรดเฉลี่ยคืออะไร"

2. PERSONAL_DATA - User-specific data (their own grades, attendance, schedule)
   Examples: "What are my grades?", "Show my attendance"
   Thai: "เกรดของฉัน", "การมาเรียนของฉัน"

3. DATABASE_QUERY - Lists, statistics, counts of items in database
   Examples: "How many students are there?", "List all teachers"
   Thai: "มีนักเรียนกี่คน", "รายชื่อครูทั้งหมด"

4. UNKNOWN - Unclear or not school-related

Query: "${question}"
User role: ${userContext?.role || 'unknown'}

IMPORTANT:
- If the query contains school-related terms (students, teachers, grades, attendance, etc.) BUT is unclear, classify as KNOWLEDGE not UNKNOWN
- Be lenient with school queries - when in doubt, prefer KNOWLEDGE over UNKNOWN
- Only use UNKNOWN for clearly non-school topics

Return ONLY the intent label (KNOWLEDGE, PERSONAL_DATA, DATABASE_QUERY, or UNKNOWN). No other text.`

    let intentLabel: string

    // Check which LLM provider to use
    const provider = process.env.LLM_PROVIDER || 'minimax'
    console.log(`[Intent] Using LLM provider: ${provider}`)

    if (provider === 'minimax' && process.env.MINIMAX_API_KEY) {
      const apiKey = process.env.MINIMAX_API_KEY
      const isNewFormat = apiKey.startsWith('sk-')
      const apiUrl = isNewFormat
        ? 'https://api.minimax.chat/v1/text/chatcompletion_pro'
        : 'https://api.minimax.chat/v1/text/chatcompletion_v2'

      const requestBody = isNewFormat
        ? {
            model: process.env.MINIMAX_MODEL || 'abab6.5s-chat',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
            max_tokens: 50
          }
        : {
            model: process.env.MINIMAX_MODEL || 'abab6.5s-chat',
            messages: [{ sender_type: 'USER', sender_name: 'User', text: prompt }],
            temperature: 0.3,
            tokens_to_generate: 50
          }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`MiniMax API HTTP error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()

      // Check MiniMax base_resp for errors
      if (data.base_resp && data.base_resp.status_code !== 0) {
        throw new Error(`MiniMax API Error (${data.base_resp.status_code}): ${data.base_resp.status_msg}`)
      }

      intentLabel = (data.choices?.[0]?.message?.content || data.reply || '').trim().toUpperCase()
    } else {
      const model = genAI.getGenerativeModel({ model: MODEL })
      const result = await model.generateContent(prompt)
      intentLabel = result.response.text().trim().toUpperCase()
    }

    // Map LLM response to Intent enum
    const validIntents = [Intent.KNOWLEDGE, Intent.PERSONAL_DATA, Intent.DATABASE_QUERY, Intent.UNKNOWN]
    let intent = validIntents.find(i => intentLabel.includes(i.toUpperCase())) || Intent.UNKNOWN

    // LLM fallback recovery: if pattern found school keywords but LLM says UNKNOWN, override to KNOWLEDGE
    if (intent === Intent.UNKNOWN && patternResult && patternResult.matchedKeywords && patternResult.matchedKeywords.length > 0) {
      console.log(`[Intent] LLM said UNKNOWN, but pattern found school keywords - overriding to KNOWLEDGE`)
      intent = Intent.KNOWLEDGE
    }

    const confidence = intent === Intent.UNKNOWN ? 0.4 : 0.85

    console.log(`[Intent] LLM classification: ${intent} (confidence: ${confidence.toFixed(2)})`)

    return {
      intent,
      confidence,
      reasoning: `LLM-based classification (${provider})`,
      suggestedAction: getSuggestedAction(intent, getRoutingAction(intent, !!userContext?.userId), userContext),
      matchedKeywords: patternResult?.matchedKeywords,
      detectedEntities: patternResult?.detectedEntities,
      routingReason: `LLM: ${provider}`
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[Intent] LLM classification failed:', errorMessage)

    // Return pattern result as fallback
    if (patternResult) {
      // Boost pattern result confidence to avoid LLM fallback loop
      return {
        ...patternResult,
        confidence: Math.max(patternResult.confidence, 0.6),
        routingReason: 'Pattern match (LLM failed)',
        reasoning: `Pattern match (LLM failed: ${errorMessage})`
      }
    }

    // Last resort
    return {
      intent: Intent.UNKNOWN,
      confidence: 0.3,
      reasoning: `LLM failed: ${errorMessage}`,
      suggestedAction: 'Ask for clarification',
      routingReason: 'LLM failed - unknown'
    }
  }
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Check if intent requires database access
 */
export function requiresDatabaseAccess(intent: Intent): boolean {
  return intent === Intent.PERSONAL_DATA || intent === Intent.DATABASE_QUERY
}

/**
 * Get routing action for intent
 */
export function getRoutingAction(intent: Intent, hasAuth: boolean): string {
  switch (intent) {
    case Intent.KNOWLEDGE:
      return 'RAG_SEARCH'
    case Intent.PERSONAL_DATA:
      return hasAuth ? 'DB_QUERY_SECURE' : 'AUTH_REQUIRED'
    case Intent.DATABASE_QUERY:
      return 'DB_QUERY'
    case Intent.AMBIGUOUS:
      return 'CLARIFICATION_NEEDED'
    case Intent.UNKNOWN:
    default:
      // NEW: Try RAG search for unknown instead of immediate clarification
      return 'RAG_SEARCH_FALLBACK'
  }
}
