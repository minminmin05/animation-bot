# RAG System Setup - Free/Open-Source Stack

## Overview

This RAG system now uses fully free and open-source alternatives:

- **Embeddings**: bge-m3 via @xenova/transformers.js (runs locally in Node.js)
- **Vector Store**: Supabase pgvector (already configured)
- **LLM**: llama3 via Ollama (runs locally)

## Prerequisites

### 1. Install Ollama

Download from https://ollama.com and install.

### 2. Pull the llama3 Model

```bash
ollama pull llama3
```

### 3. Run Ollama Server

Ollama usually auto-starts, or run manually:

```bash
ollama serve
```

Verify it's running:

```bash
curl http://localhost:11434/api/tags
```

## Database Setup

### Run the Migration

Apply the pgvector function migration to your Supabase project:

```sql
-- Via Supabase SQL Editor or migration
ALTER TABLE public.knowledge_base
  ALTER COLUMN embedding TYPE vector(1024);

CREATE OR REPLACE FUNCTION match_knowledge_base(...)
-- See migrations/2_add_rag_pgvector_function.sql
```

### Or via Supabase Dashboard:

1. Go to SQL Editor
2. Paste the content from `supabase/migrations/2_add_rag_pgvector_function.sql`
3. Run

## Server Setup

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in:

```bash
cp .env.example .env
```

Required variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_KEY` - Your Supabase service role key
- `OLLAMA_BASE_URL` - Default: `http://localhost:11434`
- `OLLAMA_MODEL` - Default: `llama3`

### 3. Seed Test Data

```bash
npm run seed
```

First run will download the bge-m3 model (~500MB).

## Run the Server

```bash
npm start
```

You should see:

```
RAG API server running on port 3001
Using model: llama3
Ollama endpoint: http://localhost:11434
[Embedding] Loading bge-m3 model (first run downloads ~500MB)...
[Embedding] Model loaded successfully
```

## Test the API

```bash
curl -X POST http://localhost:3001/api/rag/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "นักเรียนต้องแต่งตัวยังไง"}'
```

Expected response:

```json
{
  "text": "นักเรียนต้องสวมเครื่องแบบ สีขาว น้ำเงิน...",
  "emotion": "helpful",
  "tts": "นักเรียนต้องสวมเครื่องแบบ สีขาว น้ำเงิน...",
  "sources": [...]
}
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/rag/ask` | POST | Full RAG with LLM response |
| `/api/rag/query` | POST | Retrieval only (no LLM) |
| `/api/rag/embed` | POST | Add new document with embedding |

## Troubleshooting

### Ollama Connection Error

```
Error: connect ECONNREFUSED 127.0.0.1:11434
```

**Solution**: Make sure Ollama is running:
```bash
ollama serve
```

### Model Not Found

```
Error: model 'llama3' not found
```

**Solution**: Pull the model:
```bash
ollama pull llama3
```

### Embedding Generation Slow

First run downloads ~500MB model. Subsequent runs are fast.

### pgvector Function Not Found

```
Error: function match_knowledge_base does not exist
```

**Solution**: Run the migration in your Supabase SQL Editor.

## Architecture

```
User Query (Thai)
    ↓
Local Embedding (@xenova/transformers.js - bge-m3)
    ↓
Supabase pgvector (vector similarity search)
    ↓
Retrieved Context
    ↓
Ollama LLM (llama3)
    ↓
Response { text, emotion, tts, sources }
```

## Cost

- **OpenAI embeddings**: Removed (was $0.02/1M tokens)
- **Pinecone**: Removed (was $70-840/month)
- **Anthropic Claude**: Removed (was $0.25/M input tokens)
- **New stack**: $0 (fully local/free)
