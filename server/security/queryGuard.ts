/**
 * Query Guard - Block unsafe queries BEFORE processing
 *
 * This is a FIRST LINE OF DEFENSE that runs BEFORE intent classification
 * and BEFORE any database access.
 *
 * Rules:
 * - Run BEFORE intent classification
 * - Do NOT rely on LLM for security
 * - Keep patterns simple and fast
 * - Default = allow (unless clearly unsafe)
 */

export interface GuardResult {
  safe: boolean
  reason?: string
  message?: string
}

/**
 * Patterns that should be BLOCKED
 *
 * IMPORTANT: Keep patterns specific to data access attempts.
 * Allow legitimate policy questions like "Does everyone need to wear uniforms?"
 */
const BLOCK_PATTERNS = [
  // Multi-user data access attempts - Thai (context-specific)
  /ทั้งหมด/,
  /ของคนอื่น/,
  /ของเพื่อน/,
  /นักเรียนทั้งหมด/,
  /ทุกนักเรียน/,
  /คนอื่น/,
  /เพื่อน/,
  /รายชื่อนักเรียน/,
  /ข้อมูลทุกคน/,
  /รายชื่อ.*ทุกคน/, // "list everyone"
  /ทุกคน.*(เกรด|คะแนน|ข้อมูล|สอบ|attendance)/, // only with data keywords
  /นักเรียนทุกคน.*(เกรด|คะแนน|ข้อมูล)/, // only with data keywords

  // Multi-user data access attempts - English (context-specific)
  /all students/i,
  /every student/i,
  /other users/i,
  /someone else/i,
  /my friend/i,
  /my friends/i,
  /classmates/i,
  /show all/i,
  /list all/i,
  /all grades/i,
  /all data/i,
  /show me everything/i,
  /show everything/i,
  /everyone'?s\s+(grades|data|scores|attendance|schedule|information)/i,
  /everyone.*(grades|scores|data)/i,
  /get\s+everyone/i,
  /show\s+everyone/i,
  /everyone'?s\b.*(?!required|need|must|have)/i, // block "everyone's" but allow policy questions

  // Prompt injection / system override attempts
  /ignore previous/i,
  /ignore all/i,
  /disregard/i,
  /override/i,
  /bypass/i,
  /reveal hidden/i,
  /show database/i,
  /dump data/i,
  /export.*data/i,
  /system prompt/i,
  /developer mode/i,
  /admin mode/i,
  /jailbreak/i,

  // Data scraping patterns
  /list\s+everything/i,
  /get\s+all/i,
  /fetch\s+all/i,
  /all\s+records/i,

  // SQL / Code injection patterns
  /select\s+.*\s+from/i,
  /union\s+select/i,
  /drop\s+table/i,
  /exec\s*\(/i,
  /eval\s*\(/i,
  /require\s*\(/i,
  /;.*drop/i,
  /'.*--/,

  // PII / sensitive requests
  /phone\s+number/i,
  /home\s+address/i,
  /emergency\s+contact/i,
  /parent's?\s+phone/i,
  /social\s+security/i,
  /password/i
]

/**
 * Patterns that are explicitly ALLOWED (policy questions)
 * These check for legitimate uses of words that might otherwise look suspicious
 */
const ALLOWED_PATTERNS = [
  /everyone\s+(required|need|must|have|wear|attend)/i,
  /ทุกคน\s+(ต้อง|ห้าม|ควร|ได้รับ|ใส่)/,
  /does\s+everyone\s+(have|need|must)/i,
  /is\s+everyone\s+(required|expected)/i
]

/**
 * Check if query is safe
 *
 * @param query - The user's query
 * @param userRole - The user's role (optional, for admin checks)
 * @returns GuardResult indicating if query is safe
 */
export function checkQuerySafety(
  query: string,
  userRole?: string
): GuardResult {
  const lowerQuery = query.toLowerCase().trim()

  // Empty query check
  if (!lowerQuery || /^\s*$/.test(query)) {
    return {
      safe: false,
      reason: 'EMPTY_QUERY',
      message: 'กรุณาพิมพ์คำถาม (Please enter a question)'
    }
  }

  // Check explicitly allowed patterns first (policy questions, etc.)
  for (const pattern of ALLOWED_PATTERNS) {
    if (pattern.test(lowerQuery)) {
      console.log('[QueryGuard] ALLOWED by explicit pattern:', pattern)
      return { safe: true }
    }
  }

  // Check against blocked patterns
  for (const pattern of BLOCK_PATTERNS) {
    if (pattern.test(lowerQuery)) {
      console.log('[QueryGuard] BLOCKED pattern matched:', pattern)

      return {
        safe: false,
        reason: 'BLOCKED_PATTERN',
        message: 'ขออภัย เราไม่สามารถตอบได้เนื่องจากเป็นการละเมิดข้อมูลส่วนบุคคล (Unauthorized access to personal data)'
      }
    }
  }

  // Additional check: queries about other people by name
  // This catches attempts like "John's grades" or "How is Sarah doing?"
  // Pattern: "someone's data" or "How is [name]"
  const otherPersonPatterns = [
    /how\s+is\s+(?!me|i)[a-z]+\??/i, // "How is John?" but NOT "How is I?"
    /what\s+are\s+(?!my)[a-z]+'s/i, // "What are John's" but NOT "What are my's"
    /show\s+(?!my)[a-z]+'s/i, // "Show John's" but NOT "Show my's"
    /how\s+is\s+(?!my)[a-z]+\s+doing/i, // "How is [name] doing"
    // Thai: explicitly block "of friend", "of others", "of [name]"
    /เกรดของเพื่อน/,
    /เกรดของคนอื่น/,
    /ข้อมูลของเพื่อน/,
    /ข้อมูลของคนอื่น/,
    /เกรด.*คนอื่น/,
    /ข้อมูล.*คนอื่น/
  ]

  // Explicitly allow patterns that are clearly about self
  const selfPatterns = [
    /เกรดของฉัน/,
    /ข้อมูลของฉัน/,
    /เกรดของฉัน/,
    /ตารางเรียนของฉัน/,
    /การมาเรียนของฉัน/,
    /my\s+grades/i,
    /my\s+attendance/i,
    /my\s+schedule/i,
    /my\s+class/i
  ]

  // If query explicitly mentions self, it's safe
  for (const pattern of selfPatterns) {
    if (pattern.test(lowerQuery)) {
      return { safe: true }
    }
  }

  // Only block these for non-admin users
  if (userRole !== 'admin') {
    for (const pattern of otherPersonPatterns) {
      if (pattern.test(lowerQuery)) {
        console.log('[QueryGuard] BLOCKED other person query:', pattern)

        return {
          safe: false,
          reason: 'OTHER_PERSON_DATA',
          message: 'ขออภัย เราไม่สามารถตอบได้เนื่องจากเป็นการละเมิดข้อมูลส่วนบุคคล (Privacy policy: You can only view your own data)'
        }
      }
    }
  }

  // Query passed all checks
  console.log('[QueryGuard] Query passed safety check')

  return { safe: true }
}

/**
 * Get blocked patterns count (for monitoring)
 */
export function getBlockedPatternsCount(): number {
  return BLOCK_PATTERNS.length
}

/**
 * Add custom blocked pattern (for extensibility)
 */
export function addBlockedPattern(pattern: RegExp): void {
  BLOCK_PATTERNS.push(pattern)
  console.log('[QueryGuard] Added custom pattern:', pattern)
}
