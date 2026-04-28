-- ========================================
-- CLEANUP ORPHANED AUTH RECORDS
-- ========================================
-- This script helps identify and optionally clean up orphaned auth.users records
-- (records in auth.users that don't have corresponding records in public.users)

-- First, let's see what orphaned records exist
SELECT
  au.id,
  au.email,
  au.created_at,
  au.deleted_at,
  'orphaned' as status
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users pu
  WHERE pu.id = au.id
)
AND au.deleted_at IS NULL;

-- Count of orphaned records
SELECT
  COUNT(*) as orphaned_count,
  'orphaned auth records (not in public.users)' as description
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users pu
  WHERE pu.id = au.id
)
AND au.deleted_at IS NULL;

-- Also check for soft-deleted auth records that might be blocking signups
SELECT
  COUNT(*) as soft_deleted_count,
  'soft-deleted auth records' as description
FROM auth.users
WHERE deleted_at IS NOT NULL;

-- Find any emails that appear in both tables with different IDs (data integrity issue)
SELECT
  pu.email as email,
  pu.id as public_id,
  au.id as auth_id,
  'email exists in both tables with different IDs' as issue
FROM public.users pu
INNER JOIN auth.users au ON pu.email = au.email
WHERE pu.id != au.id
AND au.deleted_at IS NULL;

-- ========================================
-- CLEANUP COMMANDS (USE WITH CAUTION)
-- ========================================

-- To delete all orphaned auth records (uncomment to run):
-- DELETE FROM auth.users
-- WHERE NOT EXISTS (
--   SELECT 1 FROM public.users pu
--   WHERE pu.id = auth.users.id
-- )
-- AND deleted_at IS NULL;

-- To permanently delete soft-deleted auth records (uncomment to run):
-- DELETE FROM auth.users WHERE deleted_at IS NOT NULL;
