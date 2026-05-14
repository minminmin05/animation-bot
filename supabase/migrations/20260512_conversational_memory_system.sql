-- ============================================================
-- Conversational RAG Memory System
-- ============================================================
-- This migration creates tables for chat session management,
-- message storage with embeddings, and session summaries.

-- ============================================================
-- 1. CHAT SESSIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  summary TEXT,

  -- Session metadata
  metadata JSONB DEFAULT '{}',
  message_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for session queries
CREATE INDEX idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_created_at ON public.chat_sessions(created_at DESC);
CREATE INDEX idx_chat_sessions_updated_at ON public.chat_sessions(updated_at DESC);
CREATE INDEX idx_chat_sessions_last_message_at ON public.chat_sessions(last_message_at DESC);

-- Full-text search on title
CREATE INDEX idx_chat_sessions_title_gin ON public.chat_sessions USING gin(to_tsvector('thai', coalesce(title, '')));

-- ============================================================
-- 2. CHAT MESSAGES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Message content
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,

  -- Embedding for semantic search (384 dimensions for all-MiniLM-L6-v2)
  embedding vector(384),

  -- Importance score (0.0 - 1.0)
  importance_score FLOAT DEFAULT 0.5,

  -- Metadata for additional context
  metadata JSONB DEFAULT '{}',

  -- Processing flags
  is_embedded BOOLEAN DEFAULT FALSE,
  is_processed BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for message queries
CREATE INDEX idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at DESC);
CREATE INDEX idx_chat_messages_role ON public.chat_messages(role);
CREATE INDEX idx_chat_messages_importance ON public.chat_messages(importance_score DESC);
CREATE INDEX idx_chat_messages_is_embeded ON public.chat_messages(is_embedded) WHERE is_embedded = FALSE;

-- Composite index for recent message retrieval
CREATE INDEX idx_chat_messages_session_created ON public.chat_messages(session_id, created_at DESC);

-- Vector similarity index (HNSW for faster search)
CREATE INDEX idx_chat_messages_embedding_hnsw ON public.chat_messages
  USING hnsw (embedding vector_cosine_ops)
  WHERE embedding IS NOT NULL;

-- ============================================================
-- 3. SESSION SUMMARIES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.session_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Summary content
  summary TEXT NOT NULL,
  summary_type TEXT DEFAULT 'auto' CHECK (summary_type IN ('auto', 'manual', 'periodic')),

  -- Embedding for semantic search
  embedding vector(384),

  -- Summary metadata
  message_count INTEGER,
  time_span_start TIMESTAMPTZ,
  time_span_end TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for summary queries
CREATE INDEX idx_session_summaries_session_id ON public.session_summaries(session_id);
CREATE INDEX idx_session_summaries_user_id ON public.session_summaries(user_id);
CREATE INDEX idx_session_summaries_created_at ON public.session_summaries(created_at DESC);
CREATE INDEX idx_session_summaries_updated_at ON public.session_summaries(updated_at DESC);

-- Vector similarity index for summaries
CREATE INDEX idx_session_summaries_embedding_hnsw ON public.session_summaries
  USING hnsw (embedding vector_cosine_ops)
  WHERE embedding IS NOT NULL;

-- ============================================================
-- 4. VECTOR SEARCH FUNCTIONS
-- ============================================================

-- Function to search semantically similar messages
CREATE OR REPLACE FUNCTION match_chat_messages(
  user_id_param UUID,
  session_id_param UUID,
  query_embedding vector(384),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5,
  exclude_session_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  session_id UUID,
  role TEXT,
  content TEXT,
  importance_score FLOAT,
  similarity FLOAT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.session_id,
    m.role,
    m.content,
    m.importance_score,
    1 - (m.embedding <=> query_embedding) as similarity,
    m.created_at
  FROM chat_messages m
  WHERE m.user_id = user_id_param
    AND m.embedding IS NOT NULL
    AND m.is_embedded = TRUE
    AND (session_id_param IS NULL OR m.session_id = session_id_param)
    AND (exclude_session_id IS NULL OR m.session_id != exclude_session_id)
    AND 1 - (m.embedding <=> query_embedding) > match_threshold
  ORDER BY m.embedding <=> query_embedding, m.importance_score DESC
  LIMIT match_count;
END;
$$;

-- Function to search session summaries
CREATE OR REPLACE FUNCTION match_session_summaries(
  user_id_param UUID,
  query_embedding vector(384),
  match_threshold FLOAT DEFAULT 0.65,
  match_count INT DEFAULT 3
)
RETURNS TABLE (
  id UUID,
  session_id UUID,
  summary TEXT,
  summary_type TEXT,
  similarity FLOAT,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.session_id,
    s.summary,
    s.summary_type,
    1 - (s.embedding <=> query_embedding) as similarity,
    s.updated_at
  FROM session_summaries s
  WHERE s.user_id = user_id_param
    AND s.embedding IS NOT NULL
    AND 1 - (s.embedding <=> query_embedding) > match_threshold
  ORDER BY s.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================================
-- 5. HELPER FUNCTIONS
-- ============================================================

-- Function to update session metadata
CREATE OR REPLACE FUNCTION update_session_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Update message count and last message timestamp
  UPDATE chat_sessions
  SET
    message_count = message_count + 1,
    last_message_at = NOW(),
    updated_at = NOW()
  WHERE id = NEW.session_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic session updates
CREATE TRIGGER trigger_update_session_metadata
AFTER INSERT ON chat_messages
FOR EACH ROW
EXECUTE FUNCTION update_session_metadata();

-- Function to get recent messages with importance filtering
CREATE OR REPLACE FUNCTION get_recent_messages(
  user_id_param UUID,
  session_id_param UUID,
  limit_count INT DEFAULT 10,
  min_importance FLOAT DEFAULT 0.0
)
RETURNS TABLE (
  id UUID,
  role TEXT,
  content TEXT,
  importance_score FLOAT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.role,
    m.content,
    m.importance_score,
    m.created_at
  FROM chat_messages m
  WHERE m.user_id = user_id_param
    AND m.session_id = session_id_param
    AND m.importance_score >= min_importance
  ORDER BY m.created_at DESC
  LIMIT limit_count;
END;
$$;

-- ============================================================
-- 6. ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_summaries ENABLE ROW LEVEL SECURITY;

-- Chat Sessions Policies
CREATE POLICY "Users can view their own sessions"
  ON public.chat_sessions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own sessions"
  ON public.chat_sessions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own sessions"
  ON public.chat_sessions FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own sessions"
  ON public.chat_sessions FOR DELETE
  USING (user_id = auth.uid());

-- Chat Messages Policies
CREATE POLICY "Users can view their own messages"
  ON public.chat_messages FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own messages"
  ON public.chat_messages FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own messages"
  ON public.chat_messages FOR DELETE
  USING (user_id = auth.uid());

-- Session Summaries Policies
CREATE POLICY "Users can view their own summaries"
  ON public.session_summaries FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own summaries"
  ON public.session_summaries FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own summaries"
  ON public.session_summaries FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own summaries"
  ON public.session_summaries FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================
-- 7. GRANT PERMISSIONS
-- ============================================================

GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON public.chat_sessions TO authenticated;
GRANT ALL ON public.chat_messages TO authenticated;
GRANT ALL ON public.session_summaries TO authenticated;
GRANT EXECUTE ON FUNCTION match_chat_messages TO authenticated;
GRANT EXECUTE ON FUNCTION match_session_summaries TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_messages TO authenticated;

-- ============================================================
-- 8. COMMENTS FOR DOCUMENTATION
-- ============================================================

COMMENT ON TABLE public.chat_sessions IS 'Stores chat sessions with user conversations';
COMMENT ON TABLE public.chat_messages IS 'Stores individual chat messages with embeddings for semantic search';
COMMENT ON TABLE public.session_summaries IS 'Stores conversation summaries for memory compression';

COMMENT ON COLUMN public.chat_messages.embedding IS '384-dimensional vector for semantic similarity search (all-MiniLM-L6-v2)';
COMMENT ON COLUMN public.chat_messages.importance_score IS 'Score from 0.0 to 1.0 indicating message importance for long-term memory';

COMMENT ON FUNCTION match_chat_messages IS 'Searches semantically similar messages across user sessions';
COMMENT ON FUNCTION match_session_summaries IS 'Searches semantically similar session summaries';
COMMENT ON FUNCTION get_recent_messages IS 'Retrieves recent messages from a session with optional importance filtering';
