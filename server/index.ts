import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { generateEmbedding, getModelInfo, getEmbeddingConfig } from './rag/services/embedding.service.js'
import { classifyIntentHybrid, classifyIntent, Intent, requiresDatabaseAccess, getRoutingAction } from './rag/services/intent.service.js'

// Helper to get the current model name
const EMBED_MODEL = () => getModelInfo().MODEL_NAME
import { searchByEmbedding, insertKnowledgeBase } from './rag/services/supabase.service'
import { generateAnswer, MODEL as LLM_MODEL } from './rag/services/llm.service'
import {
  getSettings,
  updateGeneralSettings,
  updateThemeSettings,
  updateNotificationSettings,
  updateEmbeddingProvider,
  regenerateEmbeddings,
  getRegenerationStatus
} from './api/settings.controller.js'
import { testEmbeddingSimilarity } from './api/embedding-test.controller.js'
import {
  getAccessPolicies,
  updateAccessPolicy,
  createAccessPolicy,
  deleteAccessPolicy,
  resetAccessPolicies,
  getAccessPoliciesSummary
} from './api/access-policies.controller.js'
import { getPersonalData } from './services/grade.service.js'
import { checkQuerySafety } from './security/queryGuard.js'

const app = express()
app.use(cors())
app.use(express.json())

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
        message: intentResult.clarificationQuestion || 'Could you please clarify your question?',
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
          message: 'กรุณาเข้าสู่ระบบก่อน (Please login first)',
          emotion: 'concerned'
        })
      }

      // Detect what type of personal data is being requested
      const dataType = detectPersonalDataType(question)

      console.log('[API] PERSONAL_DATA request:', {
        userId,
        userRole,
        dataType,
        action: 'GET_' + dataType.toUpperCase()
      })

      try {
        // Fetch personal data securely
        const personalData = await getPersonalData(userId, userRole || 'student', dataType)

        // Check if data exists
        if (!personalData || (Array.isArray(personalData) && personalData.length === 0)) {
          return res.json({
            intent: intentResult.intent,
            type: 'personal_data',
            message: 'ไม่พบข้อมูลของคุณในระบบ (No data found for you in the system)',
            emotion: 'helpful'
          })
        }

        // Format data for AI response
        let context = ''
        if (dataType === 'grades') {
          const grades = personalData as any[]
          context = grades.map(g =>
            `วิชา: ${g.subject}, คะแนน: ${g.score}, เกรด: ${g.grade}`
          ).join('\n')
        } else if (dataType === 'attendance') {
          const attendance = personalData as any[]
          const summary = {
            present: attendance.filter(a => a.status === 'present').length,
            absent: attendance.filter(a => a.status === 'absent').length,
            late: attendance.filter(a => a.status === 'late').length,
            total: attendance.length
          }
          context = `การมาเรียน: มา ${summary.present} วัน, ขาด ${summary.absent} วัน, สาย ${summary.late} วัน (ทั้งหมด ${summary.total} วัน)`
        } else if (dataType === 'schedule') {
          const schedule = personalData as any[]
          context = schedule.map(s =>
            `${s.subject} (${s.class_name})${s.room_number ? ` - ห้อง ${s.room_number}` : ''}`
          ).join('\n')
        }

        // Generate AI response with personal data context
        const answer = await generateAnswer(question, [], context)

        console.log('[API] PERSONAL_DATA response sent')

        return res.json({
          ...answer,
          intent: intentResult.intent,
          type: 'personal_data',
          dataType,
          emotion: 'happy' // Positive emotion for successful data retrieval
        })
      } catch (error: any) {
        console.error('[API] PERSONAL_DATA error:', error.message)

        // Handle security violations
        if (error.message.includes('UNAUTHORIZED') || error.message.includes('AUTH_REQUIRED')) {
          return res.json({
            intent: intentResult.intent,
            error: 'UNAUTHORIZED',
            message: 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้ (You are not authorized to access this data)',
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

    // Handle UNKNOWN intent
    if (intentResult.intent === Intent.UNKNOWN) {
      return res.json({
        intent: intentResult.intent,
        message: 'ฉันไม่แน่ใจว่าคุณถามเกี่ยวกับอะไร (I\'m not sure what you\'re asking about)',
        suggestion: 'คุณสามารถถามเกี่ยวกับ: กฎของโรงเรียน, วันหยุด, หรือข้อมูลการลงทะเบียน',
        examples: [
          'กฎเครื่องแบบคืออะไร? (What is the dress code policy?)',
          'เกรดของฉันเป็นอย่างไร? (How are my grades?)'
        ]
      })
    }

    // Handle KNOWLEDGE intent - proceed with RAG
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
    const answer = await generateAnswer(question, sources)
    console.log(`[API] Answer generated successfully`)

    console.log(`[API] Returning answer\n`)

    res.json({
      ...answer,
      intent: intentResult.intent,
      routing: routingAction,
      confidence: intentResult.confidence
    })
  } catch (error) {
    console.error('[API] Error details:')
    console.error('  Error type:', error instanceof Error ? error.constructor.name : typeof error)
    console.error('  Error message:', error instanceof Error ? error.message : String(error))
    console.error('  Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    // Return error in format that frontend expects
    res.status(500).json({
      text: 'ขออภัย ระบบไม่สามารถตอบได้ในขณะนี้ กรุณาลองใหม่ภายหลัง',
      emotion: 'warning',
      error: error instanceof Error ? error.message : 'Unknown error',
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
  console.log(`LLM: ${LLM_MODEL}`)
  console.log(`========================================\n`)
})
