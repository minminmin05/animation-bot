/**
 * Conversational Memory API Controller
 *
 * REST API endpoints for the memory system.
 */

import { Router, Response } from 'express'
import { getConversationalPipelineService, ConversationalRequest } from '../memory/index.js'
import { authenticate, AuthenticatedRequest } from '../security/auth.middleware.js'

const router = Router()
const pipeline = getConversationalPipelineService()

// Apply authentication middleware to all routes in this router
router.use(authenticate)

// ============================================================
// TYPES
// ============================================================

// Types moved to auth.middleware.ts

// ============================================================
// ENDPOINTS
// ============================================================

/**
 * POST /api/memory/chat
 * Process a conversational request with full memory support
 */
router.post('/chat', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { query, sessionId } = req.body

    if (!query) {
      return res.status(400).json({ error: 'Query is required' })
    }

    const userId = req.user!.id
    const userRole = req.user!.role || 'student'

    const request: ConversationalRequest = {
      query,
      userId,
      sessionId,
      userRole: userRole || 'student'
    }

    const response = await pipeline.process(request)

    res.json({
      success: true,
      response: {
        text: response.response.text,
        emotion: response.response.emotion,
        tts: response.response.tts
      },
      context: response.context,
      sessionId: response.sessionId,
      messageId: response.messageId,
      userMessageId: response.userMessageId
    })
  } catch (error) {
    console.error('[MemoryAPI] Chat error:', error)
    res.status(500).json({
      error: 'Failed to process request',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * GET /api/memory/sessions
 * Get user's conversation sessions
 */
router.get('/sessions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id

    const limit = parseInt(req.query.limit as string) || 20
    const sessions = await pipeline.getSessions(userId, limit)

    res.json({ sessions })
  } catch (error) {
    console.error('[MemoryAPI] Sessions error:', error)
    res.status(500).json({ error: 'Failed to fetch sessions' })
  }
})

/**
 * GET /api/memory/sessions/:sessionId
 * Get session history
 */
router.get('/sessions/:sessionId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id

    const { sessionId } = req.params
    const limit = parseInt(req.query.limit as string) || 50

    const history = await pipeline.getHistory(sessionId, userId, limit)

    res.json({ history })
  } catch (error) {
    console.error('[MemoryAPI] History error:', error)
    res.status(500).json({ error: 'Failed to fetch history' })
  }
})

/**
 * DELETE /api/memory/sessions/:sessionId
 * Delete entire session, messages, and vector memory
 */
router.delete('/sessions/:sessionId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id

    const { sessionId } = req.params
    const { getMemoryManagerService } = await import('../memory/index.js')
    const memoryManager = getMemoryManagerService()

    const success = await memoryManager.deleteSession(sessionId, userId)

    if (success) {
      res.json({ success: true, message: 'Session deleted' })
    } else {
      res.status(500).json({ error: 'Failed to delete session' })
    }
  } catch (error) {
    console.error('[MemoryAPI] Delete session error:', error)
    res.status(500).json({ error: 'Failed to delete session' })
  }
})

/**
 * DELETE /api/memory/messages/:messageId
 * Delete a single message from history and memory
 */
router.delete('/messages/:messageId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id

    const { messageId } = req.params
    const { getMemoryManagerService } = await import('../memory/index.js')
    const memoryManager = getMemoryManagerService()

    const success = await memoryManager.deleteMessage(messageId, userId)

    if (success) {
      res.json({ success: true, message: 'Message deleted' })
    } else {
      res.status(500).json({ error: 'Failed to delete message' })
    }
  } catch (error) {
    console.error('[MemoryAPI] Delete message error:', error)
    res.status(500).json({ error: 'Failed to delete message' })
  }
})

/**
 * GET /api/memory/sessions/:sessionId/export
 * Export session data
 */
router.get('/sessions/:sessionId/export', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id

    const { sessionId } = req.params
    const data = await pipeline.exportSession(sessionId, userId)

    if (data) {
      res.json(data)
    } else {
      res.status(404).json({ error: 'Session not found' })
    }
  } catch (error) {
    console.error('[MemoryAPI] Export error:', error)
    res.status(500).json({ error: 'Failed to export session' })
  }
})

/**
 * POST /api/memory/search
 * Search across user's conversations
 */
router.post('/search', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id

    const { query } = req.body
    if (!query) {
      return res.status(400).json({ error: 'Query is required' })
    }

    const limit = parseInt(req.query.limit as string) || 10
    const results = await pipeline.searchConversations(userId, query, limit)

    res.json({ results })
  } catch (error) {
    console.error('[MemoryAPI] Search error:', error)
    res.status(500).json({ error: 'Failed to search conversations' })
  }
})

/**
 * POST /api/memory/sessions
 * Create a new session
 */
router.post('/sessions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id

    const { title } = req.body

    const { getMemoryManagerService } = require('../memory/index.js')
    const memoryManager = getMemoryManagerService()

    const session = await memoryManager.createSession(userId, title)

    if (session) {
      res.json({ session })
    } else {
      res.status(500).json({ error: 'Failed to create session' })
    }
  } catch (error) {
    console.error('[MemoryAPI] Create session error:', error)
    res.status(500).json({ error: 'Failed to create session' })
  }
})

/**
 * PATCH /api/memory/sessions/:sessionId
 * Update session title
 */
router.patch('/sessions/:sessionId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id

    const { sessionId } = req.params
    const { title } = req.body

    if (!title) {
      return res.status(400).json({ error: 'Title is required' })
    }

    const { getMemoryManagerService } = require('../memory/index.js')
    const memoryManager = getMemoryManagerService()

    const success = await memoryManager.updateSessionTitle(sessionId, userId, title)

    if (success) {
      res.json({ success: true })
    } else {
      res.status(500).json({ error: 'Failed to update session' })
    }
  } catch (error) {
    console.error('[MemoryAPI] Update session error:', error)
    res.status(500).json({ error: 'Failed to update session' })
  }
})

/**
 * GET /api/memory/stats
 * Get user's memory statistics
 */
router.get('/stats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id

    const stats = await pipeline.getUserStats(userId)

    res.json(stats)
  } catch (error) {
    console.error('[MemoryAPI] Stats error:', error)
    res.status(500).json({ error: 'Failed to fetch statistics' })
  }
})

export default router
