-- ========================================
-- CHECK ORPHANED AUTH USERS
-- ========================================
-- Run this script in Supabase SQL Editor to diagnose the issue
-- This will show you which emails are "stuck" in auth.users but not in public.users
-- ========================================

-- 1. Count orphaned auth.users
SELECT 'ORPHANED AUTH USERS COUNT' as info, COUNT(*) as count
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.users pu WHERE pu.id = au.id)
AND au.deleted_at IS NULL;

-- 2. Show all orphaned emails (these are the ones causing "Email already exists" errors)
SELECT
  'ORPHANED EMAILS LIST' as info,
  id,
  email,
  created_at,
  email_confirmed_at,
  'This email exists in auth.users but NOT in public.users' as status
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.users pu WHERE pu.id = au.id)
AND au.deleted_at IS NULL
ORDER BY created_at DESC;

-- 3. Check specific email (replace with the email you're testing)
-- SELECT 'TEST EMAIL CHECK' as info,
--        (SELECT COUNT(*) FROM auth.users WHERE email = 'test@example.com' AND deleted_at IS NULL) as in_auth,
--        (SELECT COUNT(*) FROM public.users WHERE email = 'test@example.com') as in_public;
