# Conversational RAG Memory System

## Overview

This document describes the production-ready Conversational RAG system with multi-layer memory architecture implemented for the school management AI assistant.

## Architecture

```
User Query
   ↓
Query Rewriter
   ↓
Retrieve:
- Recent Chat Memory
- Semantic Chat History
- RAG Knowledge Documents
- Session Summary
   ↓
Context Ranking & Deduplication
   ↓
LLM Response Generation
   ↓
Save Chat Message
   ↓
Async Embedding + Memory Processing
```

## Memory Layers

### 1. Recent Chat Memory
- **Purpose**: Maintain conversation continuity
- **Retrieval**: Latest 5-10 messages from current session
- **Filtering**: Excludes noise (ok, thanks, greetings)
- **Features**: Preserves pronoun references (มัน, อันนั้น, it, that)

### 2. Semantic History Memory
- **Purpose**: Find related historical conversations
- **Method**: Embedding-based similarity search
- **Storage**: pgvector with 384-dimensional embeddings
- **Filtering**: By user_id, session_id, importance_score

### 3. Session Summary Memory
- **Purpose**: Compress old conversations
- **Trigger**: Every 10 messages or periodic
- **Content**: Topics discussed, user goals, unresolved tasks
- **Storage**: Separate table with embeddings

### 4. Query Rewriting
- **Purpose**: Resolve ambiguous references
- **Examples**:
  - "มันแก้ยังไง" → "แก้ error EADDRINUSE ยังไง"
  - "that issue" → "database connection timeout issue"
- **Methods**: Pattern-based + optional LLM fallback

### 5. Hybrid Context Retrieval
- **Purpose**: Merge all memory sources intelligently
- **Features**:
  - Deduplication
  - Relevance ranking
  - Token budget management
  - Source prioritization

### 6. Async Memory Processing
- **Purpose**: Non-blocking embedding and summarization
- **Jobs**: Embedding generation, summary updates, cleanup
- **Queue**: Priority-based job queue with retry logic

## Database Schema

### chat_sessions
- id, user_id, title, summary
- metadata, message_count, last_message_at
- Indexes: user_id, created_at, updated_at

### chat_messages
- id, session_id, user_id, role, content
- embedding (vector(384))
- importance_score (0.0-1.0)
- is_embedded, is_processed flags
- Indexes: session_id, created_at, embedding (HNSW)

### session_summaries
- id, session_id, user_id, summary
- embedding (vector(384))
- message_count, time_span_start, time_span_end
- Indexes: session_id, embedding (HNSW)

## Security

- **Row Level Security (RLS)**: All tables have user-specific policies
- **Session Isolation**: Queries filtered by user_id and session_id
- **No Cross-User Leakage**: Strict metadata filtering

## API Endpoints

### POST /api/memory/chat
Process query with full memory support
```json
{
  "query": "เกรดของดาว",
  "sessionId": "optional-session-id",
  "userRole": "student"
}
```

### GET /api/memory/sessions
Get user's conversation sessions

### GET /api/memory/sessions/:sessionId
Get session history

### POST /api/memory/search
Search across conversations

### GET /api/memory/stats
Get user memory statistics

## Usage Example

```typescript
import { getConversationalPipelineService } from './memory/index.js'

const pipeline = getConversationalPipelineService()

const response = await pipeline.process({
  query: 'เกรดของฉันสอบครั้งล่าสุด',
  userId: 'user-123',
  sessionId: 'session-456',
  userRole: 'student'
})

console.log(response.response.text)
console.log(response.context.memorySources)
// { recent: 3, semantic: 2, summaries: 1, rag: 0 }
```

## Configuration

```typescript
import { getMemoryManagerService } from './memory/index.js'

const memoryManager = getMemoryManagerService()

memoryManager.configure({
  autoSummarize: true,
  summarizeAfterMessages: 10,
  embedMessages: true,
  rewriteQueries: true,
  maxContextTokens: 2000
})
```

## Performance Considerations

1. **Embedding Generation**: Async, non-blocking
2. **Vector Search**: HNSW index for fast similarity search
3. **Token Budget**: Configurable limit for context
4. **Caching**: Recent memory cached in-memory
5. **Batch Processing**: Background jobs for bulk operations

## Future Enhancements

1. **Redis Caching**: For frequently accessed context
2. **Distributed Queue**: For multi-instance deployments
3. **Conversation Branching**: For exploration of topics
4. **Multi-Modal Memory**: For images, files
5. **Memory Compression**: More aggressive summarization
6. **Memory Sharing**: For collaborative sessions

## Troubleshooting

### Low retrieval quality
- Check embedding generation is working
- Verify pgvector extension is enabled
- Review importance_score thresholds

### Slow responses
- Reduce maxContextTokens
- Disable semantic history for simple queries
- Check embedding service latency

### Memory leaks
- Monitor job queue size
- Clear completed jobs periodically
- Check for unbounded session growth
