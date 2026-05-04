import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { generateEmbedding } from './rag/services/embedding.service'
import { searchByEmbedding, insertKnowledgeBase } from './rag/services/supabase.service'
import { generateAnswer } from './rag/services/llm.service'

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

    const results = await searchByEmbedding(embedding, 3)
    console.log(`[API] Returning ${results.length} results\n`)

    res.json({ results })
  } catch (error) {
    console.error('[API] Error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/rag/ask - full RAG with LLM
app.post('/api/rag/ask', async (req, res) => {
  try {
    const { question } = req.body

    if (!question) {
      return res.status(400).json({ error: 'question is required' })
    }

    console.log(`\n[API] ASK received: "${question}"`)

    const embedding = await generateEmbedding(question)
    const sources = await searchByEmbedding(embedding, 3)

    const answer = await generateAnswer(question, sources)

    console.log(`[API] Returning answer\n`)

    res.json(answer)
  } catch (error) {
    console.error('[API] Error:', error)
    res.status(500).json({ error: 'Internal server error' })
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

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`RAG API server running on port ${PORT}`)
  console.log(`Using model: ${process.env.OLLAMA_MODEL || 'llama3'}`)
  console.log(`Ollama endpoint: ${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}`)
})
