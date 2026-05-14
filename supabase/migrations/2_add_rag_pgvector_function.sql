-- ============================================
-- RAG System: pgvector Matching Function
-- ============================================
-- This migration adds a function for similarity search
-- using the all-MiniLM-L6-v2 embedding model (384 dimensions)

-- First, update the embedding column to 384 dimensions (all-MiniLM-L6-v2)
ALTER TABLE public.knowledge_base
  ALTER COLUMN embedding TYPE vector(384);

-- Create or replace the matching function
CREATE OR REPLACE FUNCTION match_knowledge_base(
  query_embedding vector(384),
  match_threshold float DEFAULT 0.75,
  match_count int DEFAULT 3
)
RETURNS TABLE (
  id uuid,
  content text,
  category text,
  title text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.id,
    kb.content,
    kb.category,
    kb.title,
    1 - (kb.embedding <=> query_embedding) as similarity
  FROM knowledge_base kb
  WHERE kb.embedding IS NOT NULL
    AND 1 - (kb.embedding <=> query_embedding) > match_threshold
  ORDER BY kb.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION match_knowledge_base TO authenticated;
GRANT EXECUTE ON FUNCTION match_knowledge_base TO anon;

-- Comment on the function
COMMENT ON FUNCTION match_knowledge_base IS 'Performs similarity search on knowledge_base using pgvector cosine distance';
