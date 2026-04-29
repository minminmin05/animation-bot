-- ========================================
-- ENABLE PGCRYPTO EXTENSION
-- ========================================
-- Migration: 20240427000023_enable_pgcrypto
-- Description: Enable pgcrypto extension for password hashing (gen_salt, crypt functions)
-- ========================================

-- Enable pgcrypto extension (required for gen_salt and crypt functions)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Verify the extension is enabled
SELECT
  'pgcrypto extension enabled' as status,
  extname as extension_name,
  extversion as version
FROM pg_extension
WHERE extname = 'pgcrypto';
