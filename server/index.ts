import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { generateEmbedding, getModelInfo, getEmbeddingConfig } from './rag/services/embedding.service.js'
import { classifyIntentHybrid, classifyIntent, Intent, requiresDatabaseAccess, getRoutingAction } from './rag/services/intent.service.js'

// Helper to get the current model name
const EMBED_MODEL = () => getModelInfo().MODEL_NAME
import { searchByEmbedding, insertKnowledgeBase } from './rag/services/supabase.service'
import { generateAnswer, MODEL as LLM_MODEL, logLLMConfiguration } from './rag/services/llm.service'
import {
  getSettings,
  updateGeneralSettings,
  updateThemeSettings,
  updateNotificationSettings,
  updateEmbeddingProvider,
  updateLlmSettings,
  updateTtsSettings,
  regenerateEmbeddings,
  getRegenerationStatus
} from './api/settings.controller.js'
import { testEmbeddingSimilarity } from './api/embedding-test.controller.js'
import { generateSpeech, getTTSHealth, resetTTSHealth } from './api/tts.controller.js'
import {
  getAccessPolicies,
  updateAccessPolicy,
  createAccessPolicy,
  deleteAccessPolicy,
  resetAccessPolicies,
  getAccessPoliciesSummary
} from './api/access-policies.controller.js'
import {
  getPersonalDataByAction,
  extractStudentName
} from './services/grade.service.js'
import { checkQuerySafety } from './security/queryGuard.js'
import conversationalMemoryRouter from './api/conversational-memory.controller.js'

// ============================================================
// STRUCTURED RESPONSE FORMATTER (LLM-LESS)
// ============================================================

/**
 * Format structured data into readable Thai text WITHOUT requiring LLM.
 * This ensures responses work even when LLM providers fail.
 */
function formatStructuredResponse(
  action: string,
  data: any[],
  studentName?: string
): { text: string; emotion: string } {
  if (!data || data.length === 0) {
    return {
      text: studentName
        ? `ไม่พบข้อมูลของ ${studentName} ในระบบ`
        : 'ไม่พบข้อมูลของคุณในระบบ',
      emotion: 'helpful'
    }
  }

  let text = ''
  let emotion = 'helpful'

  switch (action) {
    case 'GET_STUDENT_PROFILE':
      const profile = data[0]
      text = `ข้อมูลนักเรียน\n`
        + `ชื่อ: ${profile.name || '-'}\n`
        + `ชั้น: ${profile.class || '-'}\n`
        + `ระดับชั้น: ${profile.grade_level || '-'}\n`
        + `วันเกิด: ${profile.date_of_birth || '-'}\n`
        + `เบอร์โทร: ${profile.phone || '-'}\n`
        + `ที่อยู่: ${profile.address || '-'}\n`
        + `ชื่อผู้ปกครอง: ${profile.parent_name || '-'}\n`
        + `ติดต่อฉุกเฉิน: ${profile.emergency_contact || '-'}`
      break

    case 'GET_GRADES':
      if (studentName) {
        text = `ผลการเรียนของ ${studentName}:\n\n`
      } else {
        text = 'ผลการเรียนของคุณ:\n\n'
      }
      data.forEach((g: any) => {
        text += `- ${g.subject}: ${g.score} (${g.grade})\n`
      })
      break

    case 'GET_ATTENDANCE':
      const summary = {
        present: data.filter((a: any) => a.status === 'present').length,
        absent: data.filter((a: any) => a.status === 'absent').length,
        late: data.filter((a: any) => a.status === 'late').length,
        excused: data.filter((a: any) => a.status === 'excused').length,
        total: data.length
      }
      const attendanceRate = summary.total > 0 ? ((summary.present / summary.total) * 100).toFixed(1) : '0'
      text = `สถิติการเข้าเรียน:\n`
        + `- มาเรียน: ${summary.present} วัน (${attendanceRate}%)\n`
        + `- ขาดเรียน: ${summary.absent} วัน\n`
        + `- มาสาย: ${summary.late} วัน\n`
        + `- ลา: ${summary.excused} วัน`
      break

    case 'GET_SCHEDULE':
      text = 'ตารางเรียน:\n\n'
      data.forEach((s: any) => {
        text += `- ${s.subject} (${s.class_name})`
        if (s.room_number) text += ` - ห้อง ${s.room_number}`
        if (s.teacher_name) text += ` - ครู ${s.teacher_name}`
        if (s.schedule) text += ` [${s.schedule}]`
        text += '\n'
      })
      break

    default:
      text = JSON.stringify(data, null, 2)
  }

  return { text, emotion }
}

const app = express()
app.use(cors())
app.use(express.json())

// ============================================================
// DATABASE QUERY HANDLER
// ============================================================

/**
 * Handle database queries (lists, statistics, counts)
 */
async function handleDatabaseQuery(res: any, question: string, intentResult?: any) {
  console.log('[API] Handling database query...')

  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )

    const q = question.toLowerCase()
    let dbContext = ''
    let queryExecuted = false

    // Check for count/statistics queries
    if (/มี(กี่|ทั้งหมด|เท่าไร)|how many|count|จำนวน/.test(q)) {
      console.log('[API] Statistics/count query detected')

      // Get counts based on what's asked
      const counts: Record<string, number> = {}

      if (/นักเรียน|student/.test(q)) {
        const { count } = await supabase.from('students').select('*', { count: 'exact', head: true })
        counts['นักเรียน'] = count || 0
      }
      if (/ครู|teacher/.test(q)) {
        const { count } = await supabase.from('teachers').select('*', { count: 'exact', head: true })
        counts['ครู'] = count || 0
      }
      if (/ห้อง|class|คลาส/.test(q)) {
        const { count } = await supabase.from('classes').select('*', { count: 'exact', head: true })
        counts['ห้องเรียน'] = count || 0
      }

      // If no specific entity mentioned, get all
      if (Object.keys(counts).length === 0) {
        const [studentCount, teacherCount, classCount] = await Promise.all([
          supabase.from('students').select('*', { count: 'exact', head: true }),
          supabase.from('teachers').select('*', { count: 'exact', head: true }),
          supabase.from('classes').select('*', { count: 'exact', head: true })
        ])
        counts['นักเรียน'] = studentCount.count || 0
        counts['ครู'] = teacherCount.count || 0
        counts['ห้องเรียน'] = classCount.count || 0
      }

      dbContext = 'สถิติโรงเรียน:\n' + Object.entries(counts)
        .map(([name, count]) => `- ${name}ทั้งหมด: ${count} ${name === 'นักเรียน' || name === 'ครู' ? 'คน' : 'ห้อง'}`)
        .join('\n')

      queryExecuted = true
    }

    // Check for list queries
    if (!queryExecuted && (/รายชื่อ|list|แสดง|show all/.test(q))) {
      console.log('[API] List query detected')

      const lists: Record<string, string> = {}

      if (/นักเรียน|student/.test(q)) {
        const { data } = await supabase.from('students').select('name').limit(50)
        if (data && data.length > 0) {
          lists['นักเรียน'] = data.map(s => s.name).join(', ')
        }
      }
      if (/ครู|teacher/.test(q)) {
        const { data } = await supabase.from('teachers').select('name').limit(50)
        if (data && data.length > 0) {
          lists['ครู'] = data.map(t => t.name).join(', ')
        }
      }

      // If asking generally, show both
      if (Object.keys(lists).length === 0) {
        const [students, teachers] = await Promise.all([
          supabase.from('students').select('name').limit(20),
          supabase.from('teachers').select('name').limit(20)
        ])

        if (students.data && students.data.length > 0) {
          lists['นักเรียน'] = students.data.map(s => s.name).join(', ')
        }
        if (teachers.data && teachers.data.length > 0) {
          lists['ครู'] = teachers.data.map(t => t.name).join(', ')
        }
      }

      dbContext = Object.entries(lists)
        .map(([name, items]) => `รายชื่อ${name} (${items.split(', ').length} คน):\n${items}`)
        .join('\n\n')

      queryExecuted = true
    }

    if (queryExecuted && dbContext) {
      // Generate answer with database context
      let answer
      try {
        answer = await generateAnswer(question, [], dbContext)
      } catch (llmError) {
        // LLM failed - return structured data directly
        console.warn('[API] LLM failed for DB query, using structured response')
        answer = {
          text: dbContext,
          emotion: 'helpful'
        }
      }

      return res.json({
        ...answer,
        intent: Intent.DATABASE_QUERY,
        type: 'database_query',
        routing: 'DB_QUERY',
        matchedKeywords: intentResult?.matchedKeywords
      })
    }

    // No specific DB query pattern matched, fallback to general
    console.log('[API] No specific DB pattern matched, falling back to general response')
    return res.json({
      intent: Intent.DATABASE_QUERY,
      text: 'ขอโทษครับ ระบบไม่สามารถดึงข้อมูลรายการนั้นได้ กรุณาลองระบุคำถามให้ชัดเจนกว่านี้',
      emotion: 'helpful'
    })
  } catch (error) {
    console.error('[API] Database query error:', error)
    return res.status(500).json({
      text: 'ขออภัย ระบบไม่สามารถดึงข้อมูลได้ในขณะนี้',
      emotion: 'concerned',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// POST /api/rag/query - retrieval only
app.post('/api/rag/query', async (req, res) => {
  try {
    const { question } = req.body

    if (!question) {
      return res.status(400).json({ error: 'question is required' })
    }

    console.log(`\n[API] Query received: "${question}"`)

    const embedding = await generateEmbedding(question)
    console.log(`[API] Embedding generated: dim=${embedding.length}`)

    const results = await searchByEmbedding(embedding, 5, 0.4)
    console.log(`[API] Search returned ${results.length} results`)
    if (results.length > 0) {
      results.forEach((r, i) => {
        console.log(`  [${i + 1}] similarity=${r.similarity.toFixed(4)} category=${r.category}`)
      })
    }
    console.log()

    res.json({ results })
  } catch (error) {
    console.error('[API] Error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/rag/ask - full RAG with LLM + intent classification (hybrid)
app.post('/api/rag/ask', async (req, res) => {
  try {
    const { question, userId, userRole, useLLMIntent } = req.body

    if (!question) {
      return res.status(400).json({ error: 'question is required' })
    }

    console.log(`\n[API] ASK received: "${question}"`)
    if (userRole) console.log(`[API] User role: ${userRole}`)

    // ============================================================
    // STEP 0: QUERY GUARD - Block unsafe queries FIRST
    // ============================================================
    const guard = checkQuerySafety(question, userRole)

    if (!guard.safe) {
      console.log(`[API] Query BLOCKED by guard: ${guard.reason}`)

      return res.json({
        text: guard.message,
        type: 'blocked',
        emotion: 'neutral',
        blocked: true,
        reason: guard.reason
      })
    }

    console.log(`[API] Query passed safety check`)

    // STEP 1: Classify intent (hybrid: pattern + LLM fallback if needed)
    const intentResult = useLLMIntent
      ? await classifyIntentHybrid(question, { userId, role: userRole }, true)
      : await classifyIntentHybrid(question, { userId, role: userRole })

    console.log(`[API] Intent: ${intentResult.intent} (confidence: ${intentResult.confidence.toFixed(2)})`)
    console.log(`[API] Reasoning: ${intentResult.reasoning}`)

    // STEP 2: Route based on intent
    const routingAction = getRoutingAction(intentResult.intent, !!userId)
    console.log(`[API] Routing: ${routingAction}`)

    // Handle AMBIGUOUS intent - ask for clarification
    if (intentResult.intent === Intent.AMBIGUOUS) {
      return res.json({
        intent: intentResult.intent,
        requiresClarification: true,
        text: intentResult.clarificationQuestion || 'Could you please clarify your question?',
        suggestions: {
          knowledge: `Ask about "${question}" in general (policies, rules, how it works)`,
          personal: `Ask about your own "${question}" (your grades, attendance, schedule)`
        },
        examples: [
          `What is the ${question} policy?`,
          `How are my ${question}s?`
        ]
      })
    }

    // Handle PERSONAL_DATA intent
    if (intentResult.intent === Intent.PERSONAL_DATA) {
      // Security: Require authentication
      if (!userId) {
        console.log('[API] PERSONAL_DATA request without auth')
        return res.json({
          intent: intentResult.intent,
          requiresAuth: true,
          text: 'กรุณาเข้าสู่ระบบก่อน (Please login first)',
          emotion: 'concerned'
        })
      }

      // Extract person name from intent service's detected entities
      const personNameEntity = intentResult.detectedEntities?.find(e => e.type === 'person_name')
      const studentName = personNameEntity?.value || null

      console.log('[API] PERSONAL_DATA request:', {
        userId,
        userRole,
        studentName,
        allEntities: intentResult.detectedEntities
      })

      try {
        // Use the new action-based API
        const result = await getPersonalDataByAction(
          question,
          studentName,
          userId,
          userRole || 'student'
        )

        console.log('[API] Action result:', {
          action: result.action,
          actionDescription: result.actionDescription,
          hasData: result.data ? result.data.length > 0 : false
        })

        // Check for errors
        if (result.error) {
          return res.json({
            intent: intentResult.intent,
            type: 'personal_data',
            action: result.action,
            text: result.error,
            emotion: 'concerned'
          })
        }

        // Check if data exists
        if (!result.data || (Array.isArray(result.data) && result.data.length === 0)) {
          return res.json({
            intent: intentResult.intent,
            type: 'personal_data',
            action: result.action,
            text: studentName
              ? `ไม่พบ${result.actionDescription}ของ ${studentName} (No ${result.actionDescription} found for ${studentName})`
              : `ไม่พบ${result.actionDescription}ของคุณในระบบ (No ${result.actionDescription} found for you)`,
            emotion: 'helpful'
          })
        }

        // Format data for AI response based on action type
        let context = ''
        switch (result.action) {
          case 'GET_STUDENT_PROFILE':
            // Format student profile
            const profile = result.data[0]
            context = Object.entries(profile)
              .filter(([_, v]) => v !== null && v !== undefined && v !== '')
              .map(([key, value]) => {
                const thaiKey: Record<string, string> = {
                  name: 'ชื่อ',
                  class: 'ชั้นเรียน',
                  grade_level: 'ระดับชั้น',
                  date_of_birth: 'วันเกิด',
                  address: 'ที่อยู่',
                  phone: 'เบอร์โทร',
                  enrollment_date: 'วันที่ลงทะเบียน',
                  parent_name: 'ชื่อผู้ปกครอง',
                  emergency_contact: 'ติดต่อฉุยเหตุ',
                  blood_type: 'กรุ๊ปเลือด',
                  medical_conditions: 'โรคประจำตัว'
                }
                return `${thaiKey[key] || key}: ${value}`
              }).join('\n')
            break

          case 'GET_GRADES':
            context = result.data.map((g: any) =>
              g.student_name
                ? `นักเรียน: ${g.student_name}, วิชา: ${g.subject}, คะแนน: ${g.score}, เกรด: ${g.grade}`
                : `วิชา: ${g.subject}, คะแนน: ${g.score}, เกรด: ${g.grade}`
            ).join('\n')
            break

          case 'GET_ATTENDANCE':
            const attendance = result.data as any[]
            const summary = {
              present: attendance.filter(a => a.status === 'present').length,
              absent: attendance.filter(a => a.status === 'absent').length,
              late: attendance.filter(a => a.status === 'late').length,
              total: attendance.length
            }
            context = `การมาเรียน: มา ${summary.present} วัน, ขาด ${summary.absent} วัน, สาย ${summary.late} วัน (ทั้งหมด ${summary.total} วัน)`
            break

          case 'GET_SCHEDULE':
            context = result.data.map((s: any) =>
              `${s.subject} (${s.class_name})${s.room_number ? ` - ห้อง ${s.room_number}` : ''}${s.schedule ? ` [${s.schedule}]` : ''}`
            ).join('\n')
            break

          default:
            context = JSON.stringify(result.data, null, 2)
        }

        // Generate AI response with personal data context
        // If LLM fails, we have a structured fallback
        let answer
        let usedStructuredFallback = false

        try {
          answer = await generateAnswer(question, [], context)
        } catch (llmError) {
          console.warn('[API] LLM generation failed, using structured fallback:', llmError)
          // LLM failed - use structured formatter instead
          const formatted = formatStructuredResponse(result.action, result.data, studentName)
          answer = {
            text: formatted.text,
            emotion: formatted.emotion
          }
          usedStructuredFallback = true
        }

        console.log('[API] PERSONAL_DATA response sent', usedStructuredFallback ? '(structured fallback)' : '(LLM)')

        return res.json({
          ...answer,
          intent: intentResult.intent,
          type: 'personal_data',
          action: result.action,
          actionDescription: result.actionDescription,
          studentName: studentName,
          emotion: 'happy', // Positive emotion for successful data retrieval
          matchedKeywords: intentResult.matchedKeywords,
          detectedEntities: intentResult.detectedEntities,
          routingReason: intentResult.routingReason,
          fallbackUsed: usedStructuredFallback
        })
      } catch (error: any) {
        console.error('[API] PERSONAL_DATA error:', error)

        // Handle security violations
        if (error.message.includes('UNAUTHORIZED') || error.message.includes('AUTH_REQUIRED') || error.message.includes('ACCESS_DENIED')) {
          return res.json({
            intent: intentResult.intent,
            error: 'UNAUTHORIZED',
            text: 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้ (You are not authorized to access this data)',
            emotion: 'concerned'
          })
        }

        return res.json({
          intent: intentResult.intent,
          error: 'DATA_FETCH_FAILED',
          message: 'ไม่สามารถดึงข้อมูลได้ในขณะนี้ (Unable to fetch data at this time)',
          emotion: 'concerned'
        })
      }
    }

    // Handle DATABASE_QUERY intent - lists, statistics, counts
    if (intentResult.intent === Intent.DATABASE_QUERY) {
      console.log('[API] DATABASE_QUERY intent detected')
      return await handleDatabaseQuery(res, question, intentResult)
    }

    // Handle UNKNOWN intent with RAG fallback (not immediate clarification)
    if (intentResult.intent === Intent.UNKNOWN && routingAction === 'RAG_SEARCH_FALLBACK') {
      console.log('[API] UNKNOWN intent with school keywords - trying RAG search fallback')
      // Continue to RAG search below
    } else if (intentResult.intent === Intent.UNKNOWN) {
      return res.json({
        intent: intentResult.intent,
        text: 'ฉันไม่แน่ใจว่าคุณถามเกี่ยวกับอะไร (I\'m not sure what you\'re asking about)',
        suggestion: 'คุณสามารถถามเกี่ยวกับ: กฎของโรงเรียน, วันหยุด, หรือข้อมูลการลงทะเบียน',
        examples: [
          'กฎเครื่องแบบคืออะไร? (What is the dress code policy?)',
          'เกรดของฉันเป็นอย่างไร? (How are my grades?)',
          'มีนักเรียนกี่คน? (How many students are there?)'
        ],
        matchedKeywords: intentResult.matchedKeywords,
        detectedEntities: intentResult.detectedEntities
      })
    }

    // Handle KNOWLEDGE intent - check for statistics questions first
    let statisticsContext = null

    // Check if this is a statistics question that needs database query
    const statsKeywords = /มี(กี่|ทั้งหมด|เท่าไร).*(นักเรียน|ครู|คน|นักเรียนทั้งหมด)|นักเรียน.*กี่คน|ครู.*กี่คน|จำนวน(นักเรียน|ครู|คน)|โรงเรียน.*มีกี่/
    if (statsKeywords.test(question)) {
      console.log('[API] Statistics question detected, querying database...')
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_KEY!
        )

        // Get student count
        const { count: studentCount } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })

        // Get teacher count
        const { count: teacherCount } = await supabase
          .from('teachers')
          .select('*', { count: 'exact', head: true })

        // Get class count
        const { count: classCount } = await supabase
          .from('classes')
          .select('*', { count: 'exact', head: true })

        statisticsContext = `สถิติโรงเรียน:\n`
          + `- นักเรียนทั้งหมด: ${studentCount || 0} คน\n`
          + `- ครูทั้งหมด: ${teacherCount || 0} คน\n`
          + `- คลาสเรียนทั้งหมด: ${classCount || 0} คลาส`

        console.log('[API] Statistics context:', statisticsContext)
      } catch (error) {
        console.error('[API] Error fetching statistics:', error)
      }
    }

    // Check if this is a database list query (asking for names/lists)
    const listKeywords = /มี.*นักเรียน.*ชื่ออะไร|รายชื่อ(นักเรียน|ครู|คน)|นักเรียน.*ทั้งหมด|ครู.*ทั้งหมด|แสดง.*รายชื่อ|ชื่อ.*(นักเรียน|ครู|คน).*บ้าง|โรงเรียน.*มี(ใคร|อะไร).*บ้าง|ดู.*รายชื่อ|list.*all.*students|show.*all.*students|who.*are.*the.*students/i
    if (listKeywords.test(question)) {
      console.log('[API] Database list query detected, querying database...')
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_KEY!
        )

        // Determine what to list
        let listContext = ''
        let queryExecuted = false

        // Check if asking for students
        if (/นักเรียน|students/i.test(question)) {
          const { data: students, error } = await supabase
            .from('students')
            .select('name, id')
            .limit(50)

          if (!error && students && students.length > 0) {
            const studentNames = students.map(s => s.name).join(', ')
            listContext += `รายชื่อนักเรียนทั้งหมด (${students.length} คน):\n${studentNames}\n\n`
            queryExecuted = true
          }
        }

        // Check if asking for teachers
        if (/ครู|teachers/i.test(question)) {
          const { data: teachers, error } = await supabase
            .from('teachers')
            .select('name, id')
            .limit(50)

          if (!error && teachers && teachers.length > 0) {
            const teacherNames = teachers.map(t => t.name).join(', ')
            listContext += `รายชื่อครูทั้งหมด (${teachers.length} คน):\n${teacherNames}\n\n`
            queryExecuted = true
          }
        }

        // If asking generally "who/what in the school", show both
        if (!queryExecuted && (/ใคร|อะไร.*บ้าง|who|what/i.test(question))) {
          // Get students
          const { data: students } = await supabase
            .from('students')
            .select('name')
            .limit(20)

          // Get teachers
          const { data: teachers } = await supabase
            .from('teachers')
            .select('name')
            .limit(20)

          listContext = `ข้อมูลในระบบ:\n\n`

          if (students && students.length > 0) {
            listContext += `นักเรียน (${students.length} คน): ${students.map(s => s.name).join(', ')}\n\n`
          }

          if (teachers && teachers.length > 0) {
            listContext += `ครู (${teachers.length} คน): ${teachers.map(t => t.name).join(', ')}\n\n`
          }

          queryExecuted = true
        }

        if (queryExecuted && listContext) {
          statisticsContext = listContext
          console.log('[API] List query context generated successfully')
        }
      } catch (error) {
        console.error('[API] Error fetching list data:', error)
      }
    }

    // Proceed with RAG (or use statistics context if available)
    console.log(`[API] Generating embedding...`)
    const embedding = await generateEmbedding(question)
    console.log(`[API] Embedding generated: dim=${embedding.length}`)

    console.log(`[API] Searching knowledge base...`)
    const sources = await searchByEmbedding(embedding, 5, 0.4)
    console.log(`[API] Search returned ${sources.length} results`)
    if (sources.length > 0) {
      sources.forEach((r, i) => {
        console.log(`  [${i + 1}] similarity=${r.similarity.toFixed(4)} category=${r.category}`)
      })
    }

    console.log(`[API] Generating answer with LLM...`)
    let answer
    let llmFailed = false

    try {
      answer = await generateAnswer(question, sources, statisticsContext || undefined)
    } catch (llmError) {
      console.warn('[API] LLM generation failed, using fallback:', llmError)
      llmFailed = true

      // If we have statistics context, return it directly
      if (statisticsContext) {
        answer = {
          text: statisticsContext,
          emotion: 'helpful'
        }
      } else if (sources.length > 0) {
        // Return raw RAG sources if LLM fails
        answer = {
          text: 'พบข้อมูลที่เกี่ยวข้อง:\n\n' +
                sources.map((s, i) => `${i + 1}. ${s.content}`).join('\n\n'),
          emotion: 'helpful'
        }
      } else {
        // No data available
        answer = {
          text: 'ขออภัย ไม่พบข้อมูลที่เกี่ยวข้อง กรุณาลองถามคำถามอื่น\n\n(Sorry, no relevant information found. Please try another question.)',
          emotion: 'neutral'
        }
      }
    }

    console.log(`[API] Answer generated${llmFailed ? ' (LLM failed, used fallback)' : ' successfully'}`)

    console.log(`[API] Returning answer\n`)

    res.json({
      ...answer,
      intent: intentResult.intent,
      routing: routingAction,
      confidence: intentResult.confidence,
      // Enhanced debugging info
      matchedKeywords: intentResult.matchedKeywords,
      detectedEntities: intentResult.detectedEntities,
      routingReason: intentResult.routingReason
    })
  } catch (error) {
    console.error('[API] Error details:')
    console.error('  Error type:', error instanceof Error ? error.constructor.name : typeof error)
    console.error('  Error message:', error instanceof Error ? error.message : String(error))

    // Check if this is an LLM failure - provide helpful message instead of hard error
    const errorMessage = error instanceof Error ? error.message : String(error)
    const isLLMError = errorMessage.includes('API') ||
                       errorMessage.includes('quota') ||
                       errorMessage.includes('key') ||
                       errorMessage.includes('LLM')

    if (isLLMError) {
      console.log('[API] LLM error detected, returning graceful fallback')
      return res.json({
        text: 'ขออภัย ระบบปัญญาประดิษฐ์ไม่ว่าง แต่ระบบยังสามารถตอบคำถามเกี่ยวกับข้อมูลนักเรียน เกรด และการเข้าเรียนได้\n\n(Sorry, the AI system is unavailable, but you can still ask about student grades, attendance, and schedules.)',
        emotion: 'helpful',
        error: errorMessage,
        type: 'llm_unavailable'
      })
    }

    // Return error in format that frontend expects
    res.status(500).json({
      text: 'ขออภัย ระบบไม่สามารถดำเนินการได้ในขณะนี้ กรุณาลองใหม่ภายหลัง',
      emotion: 'warning',
      error: errorMessage,
      type: 'error'
    })
  }
})

// POST /api/rag/embed
app.post('/api/rag/embed', async (req, res) => {
  try {
    const { text, category, title } = req.body

    if (!text) {
      return res.status(400).json({ error: 'text is required' })
    }

    const id = crypto.randomUUID()
    const embedding = await generateEmbedding(text)

    await insertKnowledgeBase({
      id,
      content: text,
      category,
      title,
      embedding
    })

    res.json({ id, success: true })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Settings API
app.get('/api/settings', getSettings)
app.post('/api/settings/general', updateGeneralSettings)
app.post('/api/settings/theme', updateThemeSettings)
app.post('/api/settings/notifications', updateNotificationSettings)
app.post('/api/settings/embedding', updateEmbeddingProvider)
app.post('/api/settings/llm', updateLlmSettings)
app.post('/api/settings/tts', updateTtsSettings)
app.post('/api/embeddings/regenerate', regenerateEmbeddings)
app.get('/api/embeddings/regenerate/status', getRegenerationStatus)

// Embedding Test API
app.post('/api/embeddings/test', testEmbeddingSimilarity)

// Access Policies API (Admin only)
app.get('/api/access-policies', getAccessPolicies)
app.get('/api/access-policies/summary', getAccessPoliciesSummary)
app.put('/api/access-policies/:id', updateAccessPolicy)
app.post('/api/access-policies', createAccessPolicy)
app.delete('/api/access-policies/:id', deleteAccessPolicy)
app.post('/api/access-policies/reset', resetAccessPolicies)

// POST /api/rag/intent - test intent classification
app.post('/api/rag/intent', async (req, res) => {
  const { question, userId, userRole, useLLM } = req.body

  if (!question) {
    return res.status(400).json({ error: 'question is required' })
  }

  // Use hybrid classification (pattern + LLM fallback if needed)
  const patternResult = classifyIntent(question, { userId, role: userRole })

  const result = useLLM
    ? await classifyIntentHybrid(question, { userId, role: userRole }, true)
    : patternResult

  res.json({
    question,
    classification: result,
    routing: getRoutingAction(result.intent, !!userId),
    patternResult: useLLM ? patternResult : undefined,
    tests: {
      knowledge: classifyIntent('กฎเครื่องแบบคืออะไร', { role: 'student' }),
      personal: classifyIntent('เกรดของฉันเป็นอย่างไร', { role: 'student' }),
      edgeCase1: classifyIntent('เกรดเฉลี่ยคืออะไร', { role: 'student' }), // Knowledge, not personal
      edgeCase2: classifyIntent('เกรดของฉัน', { role: 'student' }) // Personal
    }
  })
})

// TTS API
app.post('/api/tts/generate', generateSpeech)
app.get('/api/tts/health', getTTSHealth)
app.post('/api/tts/health/reset', resetTTSHealth)

// Conversational Memory API
app.use('/api/memory', conversationalMemoryRouter)

// Health check
app.get('/api/rag/health', (req, res) => {
  const embedConfig = getEmbeddingConfig()
  res.json({
    status: 'ok',
    models: {
      embedding: EMBED_MODEL(),
      llm: LLM_MODEL,
      embeddingConfig: {
        provider: embedConfig.provider,
        dimensions: embedConfig.dimensions
      }
    }
  })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  const embedConfig = getEmbeddingConfig()
  console.log(`\n========================================`)
  console.log(`RAG API server running on port ${PORT}`)
  console.log(`========================================`)
  console.log(`Embedding: ${EMBED_MODEL()} (${embedConfig.provider}, ${embedConfig.dimensions}d)`)

  // Log detailed LLM configuration
  logLLMConfiguration()

  console.log(`========================================\n`)
})
