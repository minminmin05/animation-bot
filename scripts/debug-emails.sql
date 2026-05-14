-- ========================================
-- DEBUG: Find ALL emails in system
-- ========================================
-- Run in Supabase Dashboard → SQL Editor

-- Show all emails in auth.users (including deleted)
SELECT 'auth.users (all including deleted)' as source,
       id, email, email_confirmed_at, deleted_at, created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 50;

-- Show all emails in public.users
SELECT 'public.users' as source,
       id, email, role, created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 50;

-- Count total emails
SELECT
  (SELECT COUNT(*) FROM auth.users WHERE deleted_at IS NULL) as auth_users_count,
  (SELECT COUNT(*) FROM public.users) as public_users_count;

-- Find duplicate emails
SELECT email, COUNT(*) as count
FROM auth.users
WHERE deleted_at IS NULL
GROUP BY email
HAVING COUNT(*) > 1;
