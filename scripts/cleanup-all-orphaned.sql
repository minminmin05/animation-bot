-- ========================================
-- CLEANUP ALL ORPHANED USERS FIRST
-- ========================================
-- Run this FIRST to clean up all orphaned auth records

DELETE FROM auth.users
WHERE deleted_at IS NULL
AND NOT EXISTS (
  SELECT 1 FROM public.users
  WHERE public.users.id = auth.users.id
);

SELECT 'Cleanup complete' as status, ROW_COUNT as deleted_count;
