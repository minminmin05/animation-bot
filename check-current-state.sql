-- ========================================
-- DIAGNOSTIC QUERY - Run this first
-- ========================================

-- Check current RLS policies on users and teachers
SELECT
  tablename,
  policyname,
  cmd,
  CASE WHEN roles = '{authenticated}' THEN 'authenticated' ELSE roles::text END as roles
FROM pg_policies
WHERE tablename IN ('users', 'teachers')
ORDER BY tablename, policyname;

-- Check if there's data in teachers
SELECT COUNT(*) as teacher_count FROM teachers;

-- Check if there are users with teacher role
SELECT COUNT(*) as user_teacher_count FROM users WHERE role = 'teacher';
