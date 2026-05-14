-- ============================================
-- RAG System: Update Embedding Dimensions
-- ============================================
-- Migration to update from all-MiniLM-L6-v2 (384) to OpenAI text-embedding-3-small (1536)

-- Drop existing embeddings (will need to be regenerated)
UPDATE public.knowledge_base
SET embedding = NULL
WHERE embedding IS NOT NULL;

-- Update the embedding column to 1536 dimensions (OpenAI text-embedding-3-small)
ALTER TABLE public.knowledge_base
  ALTER COLUMN embedding TYPE vector(1536);

-- Update the matching function for 1536 dimensions
CREATE OR REPLACE FUNCTION match_knowledge_base(
  query_embedding vector(1536),
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
COMMENT ON FUNCTION match_knowledge_base IS 'Performs similarity search on knowledge_base using pgvector cosine distance - OpenAI text-embedding-3-small (1536 dims)';
