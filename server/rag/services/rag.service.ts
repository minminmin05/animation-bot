/**
 * RAG Service
 *
 * Main Retrieval Augmented Generation service
 * Combines vector search with LLM response generation
 */

import { searchByEmbedding, type SearchResult } from './supabase.service.js'
import { generateEmbedding } from './embedding.service.js'
import { generateAnswer } from './llm.service.js'

export interface RAGSearchOptions {
  query: string
  userId?: string
  userRole?: string
  limit?: number
  threshold?: number
}

export interface RAGResult {
  answer: string
  sources: Array<{
    type: string
    content: string
    confidence?: number
  }>
  found: boolean
  query: string
}

/**
 * Search RAG documents and generate answer
 */
export async function searchRagDocuments(options: RAGSearchOptions): Promise<RAGResult> {
  const {
    query,
    limit = 5,
    threshold = 0.4
  } = options

  try {
    // Generate embedding for the query
    const embedding = await generateEmbedding(query)

    // Search knowledge base
    const sources = await searchByEmbedding(embedding, limit, threshold)

    if (sources.length === 0) {
      return {
        answer: 'ไม่พบข้อมูลที่เกี่ยวข้อง',
        sources: [],
        found: false,
        query
      }
    }

    // Generate answer with sources
    const response = await generateAnswer(query, sources)

    return {
      answer: response.text,
      sources: sources.map(s => ({
        type: s.category,
        content: s.content,
        confidence: s.similarity
      })),
      found: true,
      query
    }

  } catch (error) {
    console.error('[RAGService] Error:', error)

    return {
      answer: 'เกิดข้อผิดพลาดในการค้นหาข้อมูล',
      sources: [],
      found: false,
      query
    }
  }
}

/**
 * Simple search without LLM generation
 */
export async function simpleRAGSearch(query: string, limit = 5): Promise<SearchResult[]> {
  try {
    const embedding = await generateEmbedding(query)
    return await searchByEmbedding(embedding, limit)
  } catch (error) {
    console.error('[RAGService] Simple search error:', error)
    return []
  }
}
