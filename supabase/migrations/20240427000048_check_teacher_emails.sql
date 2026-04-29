-- ========================================
-- TEACHER EMAILS - TESTING & LOGIN
-- Run in Supabase SQL Editor
-- ========================================

-- 1. List all teachers with their login emails
SELECT
  t.id AS teacher_id,
  t.name AS teacher_name,
  t.user_id,

  -- Email from auth.users (for login)
  auth_u.email AS login_email,
  auth_u.id AS auth_id,
  auth_u.email_confirmed_at,
  auth_u.last_sign_in_at,
  auth_u.created_at AS account_created,

  -- Check users table
  u.id AS users_record_id,
  u.role AS users_table_role,

  -- Status
  CASE
    WHEN auth_u.email IS NULL THEN '❌ NO EMAIL - Cannot login'
    WHEN u.id IS NULL THEN '⚠️ Missing in users table'
    WHEN u.role IS NULL THEN '⚠️ No role set'
    WHEN u.role != 'teacher' THEN '❌ WRONG ROLE!'
    ELSE '✅ Ready to login'
  END AS status

FROM teachers t
LEFT JOIN auth.users auth_u ON t.user_id = auth_u.id
LEFT JOIN users u ON t.user_id = u.id

ORDER BY status DESC, t.name;

-- 2. Quick summary - Count by status
SELECT
  CASE
    WHEN auth_u.email IS NULL THEN 'No email (cannot login)'
    WHEN u.id IS NULL THEN 'Missing in users table'
    WHEN u.role IS NULL THEN 'No role set'
    WHEN u.role != 'teacher' THEN 'Wrong role'
    ELSE 'Ready to login'
  END AS status,
  COUNT(*) as count
FROM teachers t
LEFT JOIN auth.users auth_u ON t.user_id = auth_u.id
LEFT JOIN users u ON t.user_id = u.id
GROUP BY status
ORDER BY status;

-- 3. Show only READY teachers (for quick copy-paste)
SELECT
  'Email: ' || auth_u.email AS login_info,
  'Password: (you set this during account creation)' AS password_hint,
  t.name AS teacher_name
FROM teachers t
JOIN auth.users auth_u ON t.user_id = auth_u.id
JOIN users u ON t.user_id = u.id
WHERE u.role = 'teacher'
ORDER BY t.name;
