-- ========================================
-- CHECK TEACHER ROLE
-- Run this in Supabase SQL Editor to check and fix teacher roles
-- ========================================

-- 1. Check all teachers
SELECT
  t.id,
  t.name,
  t.user_id,
  u.id as user_record_id,
  u.email,
  u.role as users_table_role,
  CASE
    WHEN u.id IS NULL THEN 'MISSING in users table!'
    WHEN u.role != 'teacher' THEN 'WRONG ROLE! Should be teacher'
    ELSE 'OK'
  END as status
FROM teachers t
LEFT JOIN users u ON t.user_id = u.id
ORDER BY status, t.name;

-- 2. Fix: Update all teachers to have 'teacher' role in users table
UPDATE users
SET role = 'teacher'
WHERE id IN (SELECT user_id FROM teachers)
  AND role != 'teacher';

-- 3. Create missing user records for teachers
INSERT INTO users (id, email, role, full_name, created_at, updated_at)
SELECT
  t.user_id,
  COALESCE(u_auth.email, t.name || '@school.local'),
  'teacher',
  t.name,
  t.created_at,
  NOW()
FROM teachers t
LEFT JOIN users u ON t.user_id = u.id
LEFT JOIN auth.users u_auth ON t.user_id = u_auth.id
WHERE u.id IS NULL;

SELECT 'Teacher roles checked and fixed!' as result;
