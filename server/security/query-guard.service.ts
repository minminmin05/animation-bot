/**
 * Query Guard Service
 *
 * Protects the AI Assistant from:
 * - SQL injection attempts
 * - Prompt injection attacks
 * - Unauthorized data access attempts
 * - Malicious query patterns
 * - Rate limiting abuse
 */

export interface GuardResult {
  allowed: boolean
  reason?: string
  riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical'
  sanitizedQuery?: string
  blockedPattern?: string
}

export interface QueryAuditLog {
  timestamp: Date
  userId?: string
  query: string
  intent: string
  riskLevel: string
  allowed: boolean
  reason?: string
  blockedPattern?: string
}

// Audit log storage (in-memory for now, should be persisted to DB in production)
const auditLog: QueryAuditLog[] = []
const MAX_LOG_SIZE = 1000

/**
 * Malicious patterns that should be blocked
 */
const MALICIOUS_PATTERNS = {
  // SQL Injection patterns
  sqlInjection: [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b.*\b(FROM|INTO|TABLE)\b)/i,
    /(--)|(#)|(\/\*|\*\/)/, // SQL comments
    /(\bor\b|\band\b).*=.*=.*\bor\b/i, // Boolean-based SQL injection
    /';.*--/, // SQL injection with comment termination
    /\bor\s+1\s*=\s*1/i,
    /\bunion\s+select\b/i,
    /'.*waitfor\s+delay/i,
    /;\s*drop\b/i,
    /\bxp_cmdshell\b/i,
    /\bexec\s*\(/i
  ],

  // Prompt injection / jailbreak attempts
  promptInjection: [
    /ignore\s+(previous|all)\s+(instructions|commands)/i,
    /disregard\s+everything\s+above/i,
    /forget\s+(everything|all\s+instructions)/i,
    /you\s+are\s+now\s+(a|an)\s+(unrestricted|uncensored)/i,
    /act\s+as\s+(if\s+you\s+were|though\s+you\s+are)/i,
    /developer\s+mode|admin\s+mode|root\s+mode/i,
    /override\s+(safety|security|filters)/i,
    /new\s+instructions:|instructions:\s*ignore/i,
    /\[SYSTEM\]|\[ADMIN\]|\[DEVELOPER\]/i,
    /<<\s*END|END\s*>>/i,
    /roleplay\s+as/i,
    /pretend\s+(you\s+are|to\s+be)/i,
    /hypothetical(ly)?/i,
    /for\s+educational\s+purposes/i,
    /just\s+(curious|testing|experimenting)/i
  ],

  // Attempts to access other users' data
  dataExfiltration: [
    /\b(show|tell|get|fetch|retrieve)\s+(me\s+)?(all\s+)?(students?|users?|teachers?|parents?|data)/i,
    /\b(list|export|download|dump)\s+(all\s+)?(students?|users?|data)/i,
    /\beveryone's\b|\bother\b.*\b(student|user|teacher|person)\b/i,
    /\ball\s+students?\b|\bwhole\s+class\b/i,
    /\b(class)?mate's?\b|\bfriend's?\b/i,
    /\bwho\s+(else|all)\b/i,
    /\bcompare\s+my\b.*\b(with|to)\s+(others?|everyone)/i,
    /\branking\b.*\bclass\b|\btop\s+students\b/i,
    /\baverage\s+(grade|score)\b.*\bclass\b/i,
    /\bhow\s+many\s+students\b/i,
    /\btotal\s+students\b/i
  ],

  // System / admin abuse attempts
  systemAbuse: [
    /\b(admin|administrator|root|superuser)\b/i,
    /\b(config|configuration|settings|env|environment)\b/i,
    /\b(database|db)\s+(schema|structure|tables?)/i,
    /\b(api\s+)?key\b/i,
    /\bpassword\b/i,
    /\b(token|jwt|session)\b/i,
    /\binternal\b.*\b(data|info|endpoints?)/i,
    /\b(system|server)\s+(logs|files|config)/i,
    /\bexecute?\s+(command|cmd|bash|shell)/i,
    /\brun\s+(script|code|program)/i,
    /\beval\s*\(/i,
    /\brequire\s*\(/i,
    /\bimport\s+.*\bfrom\b/i
  ],

  // PII / sensitive data requests
  piiRequests: [
    /\bphone\s+(number)?\b/i,
    /\b(address|home\s+address)\b/i,
    /\b(email\s+address?)\b/i,
    /\b(social\s+security|ssn|id\s+number)\b/i,
    /\bcredit\s+card\b/i,
    /\bbank\s+account\b/i,
    /\bmedical\b.*(record|history|info)/i,
    /\bparent's?\b.*\b(phone|address|contact)\b/i,
    /\bemergency\s+contact\b/i
  ],

  // Flood / spam patterns
  spamPatterns: [
    /^(.{0,2})\1{10,}$/, // Repeated characters (aaa...)
    /^.{500,}$/, // Very long queries
    /^\s+$/, // Empty or whitespace only
    /(.{20,}.*\1{3,})/, // Repeated phrases
  ]
}

/**
 * Suspicious keywords that should be flagged but not necessarily blocked
 */
const SUSPICIOUS_KEYWORDS = [
  'bypass', 'override', 'exploit', 'hack', 'crack',
  'vulnerability', 'backdoor', 'rootkit', 'malware',
  'injection', 'xss', 'csrf', 'sqlmap'
]

/**
 * Rate limiting per user
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW = 60000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30

/**
 * Sanitize query by removing potentially harmful characters
 */
function sanitizeQuery(query: string): string {
  return query
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
    .trim()
}

/**
 * Check if query exceeds rate limit
 */
function checkRateLimit(userId?: string): { allowed: boolean; remaining?: number } {
  if (!userId) {
    return { allowed: true } // No rate limit for anonymous queries (handled elsewhere)
  }

  const now = Date.now()
  const userLimit = rateLimitMap.get(userId)

  if (!userLimit || now > userLimit.resetTime) {
    // Create or reset rate limit
    rateLimitMap.set(userId, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    })
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1 }
  }

  if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0 }
  }

  userLimit.count++
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - userLimit.count }
}

/**
 * Analyze query for security threats
 */
function analyzeThreats(query: string): {
  riskLevel: GuardResult['riskLevel']
  matchedPatterns: string[]
  reason: string
} {
  const matches: string[] = []
  let riskLevel: GuardResult['riskLevel'] = 'safe'
  let reasons: string[] = []

  // Check SQL injection
  for (const pattern of MALICIOUS_PATTERNS.sqlInjection) {
    if (pattern.test(query)) {
      matches.push('SQL_INJECTION')
      riskLevel = 'critical'
      reasons.push('Potential SQL injection detected')
      break
    }
  }

  // Check prompt injection
  if (riskLevel !== 'critical') {
    for (const pattern of MALICIOUS_PATTERNS.promptInjection) {
      if (pattern.test(query)) {
        matches.push('PROMPT_INJECTION')
        riskLevel = 'high'
        reasons.push('Prompt injection attempt detected')
        break
      }
    }
  }

  // Check data exfiltration
  if (riskLevel === 'safe' || riskLevel === 'low') {
    const exfilMatches: string[] = []
    for (const pattern of MALICIOUS_PATTERNS.dataExfiltration) {
      if (pattern.test(query)) {
        exfilMatches.push('DATA_EXFILTRATION')
      }
    }
    if (exfilMatches.length > 0) {
      matches.push(...exfilMatches)
      riskLevel = 'high'
      reasons.push('Attempt to access other users\' data detected')
    }
  }

  // Check system abuse
  if (riskLevel === 'safe' || riskLevel === 'low') {
    for (const pattern of MALICIOUS_PATTERNS.systemAbuse) {
      if (pattern.test(query)) {
        matches.push('SYSTEM_ABUSE')
        riskLevel = 'medium'
        reasons.push('System administration query detected')
        break
      }
    }
  }

  // Check PII requests
  if (riskLevel === 'safe') {
    for (const pattern of MALICIOUS_PATTERNS.piiRequests) {
      if (pattern.test(query)) {
        matches.push('PII_REQUEST')
        riskLevel = 'medium'
        reasons.push('Request for sensitive personal information')
        break
      }
    }
  }

  // Check spam patterns
  if (riskLevel === 'safe') {
    for (const pattern of MALICIOUS_PATTERNS.spamPatterns) {
      if (pattern.test(query)) {
        matches.push('SPAM')
        riskLevel = 'low'
        reasons.push('Spam or invalid query format')
        break
      }
    }
  }

  // Check for suspicious keywords
  if (riskLevel === 'safe') {
    const foundKeywords = SUSPICIOUS_KEYWORDS.filter(kw =>
      query.toLowerCase().includes(kw)
    )
    if (foundKeywords.length > 0) {
      matches.push('SUSPICIOUS_KEYWORD')
      riskLevel = 'low'
      reasons.push(`Suspicious keywords: ${foundKeywords.join(', ')}`)
    }
  }

  return {
    riskLevel,
    matchedPatterns: matches,
    reason: reasons.join('; ') || 'Query appears safe'
  }
}

/**
 * Main guard function - validates and sanitizes queries
 */
export function guardQuery(
  query: string,
  options: {
    userId?: string
    userRole?: string
    intent?: string
    skipRateLimit?: boolean
  } = {}
): GuardResult {
  const { userId, userRole, intent, skipRateLimit = false } = options

  // Sanitize query first
  const sanitizedQuery = sanitizeQuery(query)

  // Check rate limit
  if (!skipRateLimit) {
    const rateLimit = checkRateLimit(userId)
    if (!rateLimit.allowed) {
      logQuery({
        timestamp: new Date(),
        userId,
        query: sanitizedQuery,
        intent: intent || 'unknown',
        riskLevel: 'medium',
        allowed: false,
        reason: 'Rate limit exceeded'
      })

      return {
        allowed: false,
        reason: 'Rate limit exceeded. Please try again later.',
        riskLevel: 'medium'
      }
    }
  }

  // Analyze threats
  const analysis = analyzeThreats(sanitizedQuery)

  // Log the query
  logQuery({
    timestamp: new Date(),
    userId,
    query: sanitizedQuery,
    intent: intent || 'unknown',
    riskLevel: analysis.riskLevel,
    allowed: analysis.riskLevel !== 'critical' && analysis.riskLevel !== 'high',
    reason: analysis.reason,
    blockedPattern: analysis.matchedPatterns[0]
  })

  // Block critical and high risk queries
  if (analysis.riskLevel === 'critical' || analysis.riskLevel === 'high') {
    return {
      allowed: false,
      reason: 'This query contains potentially harmful content and cannot be processed.',
      riskLevel: analysis.riskLevel,
      blockedPattern: analysis.matchedPatterns[0]
    }
  }

  // Medium risk: Allow but with warning (depending on role)
  if (analysis.riskLevel === 'medium') {
    // Admins can access some medium-risk queries
    if (userRole === 'admin') {
      return {
        allowed: true,
        reason: analysis.reason,
        riskLevel: analysis.riskLevel,
        sanitizedQuery
      }
    }

    // For non-admins, still block sensitive system queries
    if (analysis.matchedPatterns.includes('SYSTEM_ABUSE') ||
        analysis.matchedPatterns.includes('PII_REQUEST')) {
      return {
        allowed: false,
        reason: 'This type of query requires administrator privileges.',
        riskLevel: analysis.riskLevel,
        blockedPattern: analysis.matchedPatterns[0]
      }
    }

    return {
      allowed: true,
      reason: analysis.reason,
      riskLevel: analysis.riskLevel,
      sanitizedQuery
    }
  }

  // Low risk and safe: Allow
  return {
    allowed: true,
    reason: analysis.reason,
    riskLevel: analysis.riskLevel,
    sanitizedQuery
  }
}

/**
 * Log query for audit trail
 */
function logQuery(entry: QueryAuditLog): void {
  auditLog.push(entry)

  // Keep log size manageable
  if (auditLog.length > MAX_LOG_SIZE) {
    auditLog.shift()
  }
}

/**
 * Get audit log
 */
export function getAuditLog(options: {
  userId?: string
  limit?: number
  riskLevel?: string
} = {}): QueryAuditLog[] {
  let log = [...auditLog]

  if (options.userId) {
    log = log.filter(e => e.userId === options.userId)
  }

  if (options.riskLevel) {
    log = log.filter(e => e.riskLevel === options.riskLevel)
  }

  // Sort by timestamp descending
  log.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

  // Apply limit
  if (options.limit) {
    log = log.slice(0, options.limit)
  }

  return log
}

/**
 * Get security statistics
 */
export function getSecurityStats() {
  const totalQueries = auditLog.length
  const blockedQueries = auditLog.filter(e => !e.allowed).length
  const highRiskQueries = auditLog.filter(e =>
    ['high', 'critical'].includes(e.riskLevel)
  ).length

  const patternCounts = auditLog.reduce((acc, e) => {
    if (e.blockedPattern) {
      acc[e.blockedPattern] = (acc[e.blockedPattern] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)

  return {
    totalQueries,
    blockedQueries,
    blockRate: totalQueries > 0 ? (blockedQueries / totalQueries * 100).toFixed(1) + '%' : '0%',
    highRiskQueries,
    topThreats: Object.entries(patternCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([pattern, count]) => ({ pattern, count }))
  }
}

/**
 * Clear old rate limit entries (call periodically)
 */
export function cleanupRateLimits(): void {
  const now = Date.now()
  for (const [userId, data] of rateLimitMap.entries()) {
    if (now > data.resetTime) {
      rateLimitMap.delete(userId)
    }
  }
}

/**
 * Reset rate limit for a user (admin function)
 */
export function resetRateLimit(userId: string): void {
  rateLimitMap.delete(userId)
}
