import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp'

// Intent categories for query routing
export enum Intent {
  KNOWLEDGE = 'knowledge',         // Policies, rules, general info → use RAG
  PERSONAL_DATA = 'personal_data', // Grades, attendance, personal info → use secure DB query
  AMBIGUOUS = 'ambiguous',         // Could be either → ask clarification
  UNKNOWN = 'unknown'              // Not school-related or unclear
}

export interface IntentClassification {
  intent: Intent
  confidence: number
  reasoning: string
  suggestedAction: string
  needsLLMFallback?: boolean // Flag indicating if LLM should be used
  clarificationQuestion?: string // Question to ask user for AMBIGUOUS intents
}

// User context for intent classification
export interface UserContext {
  userId?: string
  role?: 'student' | 'teacher' | 'parent' | 'admin'
  studentId?: string
  teacherId?: string
}

// Intent classification patterns (English + Thai)
const INTENT_PATTERNS = {
  // KNOWLEDGE: policies, rules, general info
  [Intent.KNOWLEDGE]: [
    // English patterns - Strong indicators
    /policy|policies|rule|rules|regulation|guideline/i,
    /what('s| is| are).*policy/i,
    /dress code|uniform|khrue\b|ครอบบ|เครื่องแบบ/i,
    /grading (scale|system|policy|calculation)|calculate.*grade|gpa.*calculat/i,
    /contact|office|phone number|email/i,
    /faq|help|guide|tutorial/i,
    /calendar|holiday|break|semester|academic year/i,
    /how (do|to|can|does|is).*(apply|register|enroll|work|calculate)/i,
    /where (is|are|to).*(located|find|go)/i,
    /who (is|to contact)/i,
    /when (is|are|do).*(start|end|begin|due)/i,
    // Thai patterns - Strong indicators
    /กฎ|กติกา|ระเบียบ|ประกาศ|นโยบาย/,
    /คือ(อะไร|อย่างไร)(?!.*ของฉัน)/,
    /ทำ(อย่างไร|ไง|ไม)/,
    /ติดต่อ|สำนักงาน/,
    /วัน(หยุด|ปิดเทอม|เปิดเทอม)/,
    /ภาคเรียน|ไตรา|งาน/,
    /วิธี(ลงทะเบียน|เรียน|ทำ)/,
    /เกรดเฉลี่ย|คำนวณ.*เกรด|gpa.*/i,
    /วิชา(อะไร|ไหน)/,
    /มีสิทธิ์|สิทธิ์|แก้ตัว|กี่ครั้ง|ได้กี่/,
    // Questions about counts/statistics - must match "มี" ... "กี่" ... noun
    /มี.*กี่.*(นักเรียน|ครู|คน|ห้อง|คลาส|อาคาร)/,
    /มี(นักเรียน|ครู|คน).*กี่/,
    /นักเรียน.*กี่คน/,
    /ครู.*กี่คน/,
    /จำนวน(นักเรียน|ครู|คน|ห้อง|คลาส)/,
    /โรงเรียน.*มี(กี่|อะไร|อย่างไร)/,
    /ทั้งหมด.*กี่/,
    // General questions about school
    /สถานที่|ห้อง|อาคาร|โรงเรียน/
  ],

  // PERSONAL_DATA: grades, attendance, personal info
  [Intent.PERSONAL_DATA]: [
    // English patterns - Must include personal pronouns
    /\bmy\s+(grades?|scores?|gpa|academic|performance|results?|marks?)\b/i,
    /\bmy\s+(attendance|absences|present|record)\b/i,
    /\bmy\s+(classes?|schedule|timetable|subjects?|courses?)\b/i,
    /\bhow\s+(am\s+I|did\s+i)\s+(doing|performing|score)/i,
    /\bshow\s+(me\s+)?my\b/i,
    /\bcheck\s+my\b/i,
    /\bi\s+(need|want|have)\s+to\s+(know|see)\s+my\b/i,
    /\bdid\s+i\s+(pass|fail|miss)/i,
    /\bwhat\s+are\s+my\b/i,
    /\bhow\s+many\s+(credits?|units?|days|times).*\bi\b/i,
    /\bi\s+(have|missed|failed)/i,
    // Thai patterns - Must include personal pronouns
    /เกรดของฉัน|คะแนนของฉัน|ผลการเรียนของฉัน/,
    /ฉัน\s+สอบ|ผลสอบ\s+ของฉัน/,
    /การมาเรียนของฉัน|งานมาเรียน.*ของฉัน/,
    /ตารางเรียนของฉัน|ตาราง.*ของฉัน/,
    /คลาสของฉัน|วิชา.*ของฉัน/,
    /ฉัน\s+ขาด\s*(เรียน|ไป)\s*กี่/,
    /ฉัน\s+ลา\s*กี่.*วน|มาสาย.*ฉัน/,
    /ฉัน\s+ได้.*คะแนน|คะแนน.*ฉัน.*ได้/,
    /เกรด.*ฉัน|ผล.*ฉัน/,
    /กี่.*วัน.*ฉัน.*/
  ]
}

// Negative patterns (phrases that should NOT match an intent)
const NEGATIVE_PATTERNS = {
  // For KNOWLEDGE - these indicate personal data request
  [Intent.KNOWLEDGE]: [
    /\bmy\b/i,
    /้ฐฉัน|ของ้ฐ้ัน/
  ],

  // For PERSONAL_DATA - these indicate general knowledge
  [Intent.PERSONAL_DATA]: [
    /\b(policy|policies|rule|regulation|guideline)\b/i,
    /\bwhat is\b(?!\s+my)/i,
    /\bwhen\b(?!\s+.*\bmy\b)/i,
    /\bwhere\b(?!\s+my)/i,
    /คือ(อะไร|อย่างไร)(?!\s*ของ้ฐ้ัน)/
  ]
}

// Confidence threshold for using LLM fallback
export const LLM_FALLBACK_THRESHOLD = 0.5

// Threshold for ambiguity detection
const AMBIGUOUS_CONFIDENCE_DIFF = 0.15 // If scores are within this range, it's ambiguous

// Ambiguous patterns - keywords that could mean either
const AMBIGUOUS_PATTERNS = [
  /grades?$/i,
  /เกรด$/,
  /คะแนน$/,
  /attendance$/i,
  /การมาเรียน$/,
  /สอบ$/,
  /exam$/i,
  /test$/i,
  /วิชา$/,
  /class$/i,
  /schedule$/i,
  /ตาราง$/
]

/**
 * Calculate confidence score based on pattern matches
 * Higher score = more patterns matched, stronger indicators
 */
function calculateConfidence(
  matches: number,
  totalPatterns: number,
  hasNegativeMatch: boolean
): number {
  let baseScore = 0.5 + (matches / totalPatterns) * 0.3 // 0.5-0.8 base

  // Bonus for multiple matches
  if (matches >= 2) baseScore += 0.1
  if (matches >= 3) baseScore += 0.05

  // Penalty for negative patterns
  if (hasNegativeMatch) baseScore -= 0.3

  return Math.max(0.1, Math.min(0.95, baseScore))
}

/**
 * Generate clarification question for ambiguous intents
 */
function getClarificationQuestion(question: string, personalMatches: number, knowledgeMatches: number): string {
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

/**
 * Classify intent using pattern matching (fast, no LLM call)
 * Supports both English and Thai queries
 * Returns confidence score - if below threshold, use LLM fallback
 */
export function classifyIntent(
  question: string,
  userContext?: UserContext
): IntentClassification {
  const q = question.toLowerCase().trim()

  // Check for student name pattern first (admin queries like "show grades for John")
  const studentNamePattern = /(?:show|get|what(?:'s| is)|tell me)(?:\s+\w+){0,3}\s+(?:for|of)\s+["']?([A-Z][a-z฀-๿]+(?:\s+[A-Z][a-z฀-๿]+)?)["']?/i
  const studentNameMatch = q.match(studentNamePattern)
  const hasStudentName = studentNameMatch && studentNameMatch[1] && !/^(me|my|all|the|a|an)$/i.test(studentNameMatch[1])

  // If student name is detected with data keywords, treat as PERSONAL_DATA
  if (hasStudentName && /(grade|score|attendance|schedule|class|subject|วิชา|เกรด|คะแนน|การมาเรียน|ตาราง)/i.test(q)) {
    return {
      intent: Intent.PERSONAL_DATA,
      confidence: 0.95,
      reasoning: 'Detected student name with data keyword - admin query',
      suggestedAction: userContext?.userId ? 'Fetch data for specified student' : 'Authentication required'
    }
  }

  // Check for personal data patterns
  const personalPatterns = INTENT_PATTERNS[Intent.PERSONAL_DATA]
  const personalMatches = personalPatterns.filter(p => p.test(q))

  // Check for negative patterns (would disqualify personal data)
  const personalNegatives = NEGATIVE_PATTERNS[Intent.PERSONAL_DATA] || []
  const hasPersonalNegative = personalNegatives.some(p => p.test(q))

  // Check for knowledge patterns
  const knowledgePatterns = INTENT_PATTERNS[Intent.KNOWLEDGE]
  const knowledgeMatches = knowledgePatterns.filter(p => p.test(q))

  // Check for negative patterns (would disqualify knowledge - i.e., indicates personal)
  const knowledgeNegatives = NEGATIVE_PATTERNS[Intent.KNOWLEDGE] || []
  const hasKnowledgeNegative = knowledgeNegatives.some(p => p.test(q))

  // Calculate scores for both intents
  const personalScore = personalMatches.length > 0 && !hasPersonalNegative
    ? calculateConfidence(personalMatches.length, personalPatterns.length, false)
    : 0

  const knowledgeScore = knowledgeMatches.length > 0 && !hasKnowledgeNegative
    ? calculateConfidence(knowledgeMatches.length, knowledgePatterns.length, hasKnowledgeNegative)
    : 0

  // Check for ambiguity:
  // 1. Both types have matches AND scores are close
  // 2. Or query matches ambiguous patterns (single keyword like "grades", "เกรด")
  const hasAmbiguousPattern = AMBIGUOUS_PATTERNS.some(p => p.test(q))
  const bothMatched = personalMatches.length > 0 && knowledgeMatches.length > 0
  const scoresAreClose = Math.abs(personalScore - knowledgeScore) < AMBIGUOUS_CONFIDENCE_DIFF

  // AMBIGUOUS: Both matched with close scores, or matches ambiguous pattern with low personal indicators
  if ((bothMatched && scoresAreClose) || (hasAmbiguousPattern && personalMatches.length <= 1 && knowledgeMatches.length <= 2)) {
    return {
      intent: Intent.AMBIGUOUS,
      confidence: Math.max(personalScore, knowledgeScore, 0.4),
      reasoning: `Query could be ${personalMatches > 0 ? 'personal' : ''}${knowledgeMatches > 0 ? ' knowledge' : ''} - needs clarification`,
      suggestedAction: 'Ask user to clarify their intent',
      clarificationQuestion: getClarificationQuestion(question, personalMatches.length, knowledgeMatches.length)
    }
  }

  // PERSONAL_DATA: Strong personal indicators
  if (personalMatches.length > 0 && !hasPersonalNegative && personalScore > knowledgeScore) {
    return {
      intent: Intent.PERSONAL_DATA,
      confidence: personalScore,
      reasoning: `Matched ${personalMatches.length}/${personalPatterns.length} personal data pattern(s)`,
      suggestedAction: userContext?.userId
        ? `Query database for user's personal data`
        : 'Authentication required for personal data access',
      needsLLMFallback: personalScore < LLM_FALLBACK_THRESHOLD
    }
  }

  // KNOWLEDGE: Strong knowledge indicators
  if (knowledgeMatches.length > 0 && !hasKnowledgeNegative) {
    return {
      intent: Intent.KNOWLEDGE,
      confidence: knowledgeScore,
      reasoning: `Matched ${knowledgeMatches.length}/${knowledgePatterns.length} knowledge pattern(s)`,
      suggestedAction: 'Search RAG knowledge base',
      needsLLMFallback: knowledgeScore < LLM_FALLBACK_THRESHOLD
    }
  }

  // Default to unknown with low confidence
  return {
    intent: Intent.UNKNOWN,
    confidence: 0.2,
    reasoning: 'No clear intent pattern detected',
    suggestedAction: 'Ask user for clarification or search knowledge base as fallback',
    needsLLMFallback: true // Always use LLM for unknown
  }
}

/**
 * Hybrid classification: pattern match first, use LLM if confidence is low
 * This is the recommended function for production use
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
  console.log(`[Intent] Low confidence (${patternResult.confidence}), using LLM fallback`)
  return await classifyIntentWithLLM(question, userContext)
}

// Optional: LLM-based classification for higher accuracy (fallback)
export async function classifyIntentWithLLM(
  question: string,
  userContext?: UserContext
): Promise<IntentClassification> {
  try {
    const prompt = `You are an intent classifier for a school management AI assistant.

Classify the user's query into ONE of these categories:

1. KNOWLEDGE - General information, policies, rules, FAQs, explanations
   Examples: "What is the dress code?", "How do I register?", "When is spring break?", "How is GPA calculated?"
   Thai: "กฎเครื่องแบบคืออะไร", "เกรดเฉลี่ยคืออะไร", "สอบแก้ตัวได้กี่ครั้ง"

2. PERSONAL_DATA - User-specific data (their own grades, attendance, schedule)
   Examples: "What are my grades?", "Show my attendance", "How am I doing?", "My GPA"
   Thai: "เกรดของฉัน", "การมาเรียนของฉัน", "ฉันสอบได้กี่คะแนน"

3. AMBIGUOUS - Could be either general or personal, needs clarification
   Examples: "grades", "attendance", "exam", "เกรด", "สอบ"
   These single words without context are ambiguous

4. UNKNOWN - Unclear or not school-related

Query: "${question}"
User role: ${userContext?.role || 'unknown'}

Return ONLY the intent label (KNOWLEDGE, PERSONAL_DATA, AMBIGUOUS, or UNKNOWN). No other text.`

    let intentLabel: string

    // Check which LLM provider to use
    const provider = process.env.LLM_PROVIDER || 'minimax'
    console.log(`[Intent] Using provider: ${provider}`)

    if (provider === 'minimax' && process.env.MINIMAX_API_KEY) {
      // Use MiniMax for classification
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
        throw new Error(`MiniMax API error: ${response.status}`)
      }

      const data = await response.json()
      intentLabel = (data.choices?.[0]?.message?.content || data.reply || '').trim().toUpperCase()
    } else {
      // Use Gemini for classification
      const model = genAI.getGenerativeModel({ model: MODEL })
      const result = await model.generateContent(prompt)
      intentLabel = result.response.text().trim().toUpperCase()
    }

    const intent = Object.values(Intent).includes(intentLabel.toLowerCase() as Intent)
      ? intentLabel.toLowerCase() as Intent
      : Intent.UNKNOWN

    // High confidence for LLM-based classification
    const confidence = intent === Intent.UNKNOWN ? 0.4 : 0.9

    const clarificationQuestion = intent === Intent.AMBIGUOUS
      ? getClarificationQuestion(question, 0, 0)
      : undefined

    return {

      intent,
      confidence,
      reasoning: `LLM-based classification (${provider === 'minimax' ? 'MiniMax' : 'Gemini'})`,
      suggestedAction: intent === Intent.PERSONAL_DATA
        ? 'Query database with user authentication'
        : intent === Intent.KNOWLEDGE
        ? 'Search RAG knowledge base'
        : intent === Intent.AMBIGUOUS
        ? 'Ask user to clarify their intent'
        : 'Ask for clarification',
      clarificationQuestion
    }
  } catch (error) {
    console.error('[Intent] LLM classification failed, using pattern matching', error)
    return classifyIntent(question, userContext)
  }
}

/**
 * Check if intent requires database access (vs RAG)
 */
export function requiresDatabaseAccess(intent: Intent): boolean {
  return intent === Intent.PERSONAL_DATA
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
    case Intent.AMBIGUOUS:
      return 'CLARIFICATION_NEEDED'
    case Intent.UNKNOWN:
    default:
      return 'CLARIFICATION'
  }
}
