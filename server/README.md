# RAG Backend Server

## Setup
```bash
cd server
npm install
cp .env.example .env
# Edit .env with your keys
```

## Run
```bash
npm start
```

## Seed test data
```bash
npm run seed
```

## Test
```bash
npm test      # Test query endpoint (retrieval only)
npm run test:ask  # Test ask endpoint (full RAG with LLM)
```

## Ingest Supabase → Pinecone
```bash
npm run ingest
```

## API Endpoints

### POST /api/rag/query
```json
{ "question": "กฎการแต่งตัวนักเรียนคืออะไร" }
```

### POST /api/rag/embed
```json
{ "text": "School closed March 20-24", "category": "announcements" }
```
