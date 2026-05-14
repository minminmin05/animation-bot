-- Migration: Update RAG embedding dimensions to 384 for local multilingual model
-- Model: Xenova/paraphrase-multilingual-MiniLM-L12-v2
-- Dimensions: 384

-- Step 1: Drop the existing match function
DROP FUNCTION IF EXISTS match_knowledge_base;

-- Step 2: Alter the embedding column to 384 dimensions
ALTER TABLE public.knowledge_base
  ALTER COLUMN embedding TYPE vector(384);

-- Step 3: Recreate the match function with 384 dimensions
CREATE OR REPLACE FUNCTION match_knowledge_base(
  query_embedding vector(384),
  match_threshold float DEFAULT 0.75,
  match_count int DEFAULT 3
)
RETURNS TABLE(
  id uuid,
  content text,
  category text,
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
    1 - (kb.embedding <=> query_embedding) AS similarity
  FROM public.knowledge_base kb
  WHERE kb.embedding IS NOT NULL
    AND (1 - (kb.embedding <=> query_embedding)) >= match_threshold
  ORDER BY kb.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION match_knowledge_base IS 'Performs similarity search on knowledge_base using pgvector cosine distance - Xenova/paraphrase-multilingual-MiniLM-L12-v2 (384 dims)';
