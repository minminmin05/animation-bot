-- ========================================
-- FIX TEACHERS QUERY - Check and Fix
-- ========================================

-- First, let's see what we have
SELECT 'Step 1: Check teachers table' as step;
SELECT id, name, subject, department, user_id FROM teachers LIMIT 5;

SELECT 'Step 2: Check users table for teacher role' as step;
SELECT id, email, role, full_name FROM users WHERE role = 'teacher' LIMIT 5;

SELECT 'Step 3: Check if teachers have matching users (this is the join issue)' as step;
SELECT
  t.id as teacher_id,
  t.name as teacher_name,
  t.user_id,
  u.email,
  u.role,
  CASE WHEN u.id IS NULL THEN 'NO MATCHING USER!' ELSE 'OK' END as status
FROM teachers t
LEFT JOIN users u ON t.user_id = u.id
LIMIT 10;

-- The issue is likely: teachers exist but don't have matching users records,
-- OR the users table RLS is blocking the read.
-- Run the diagnostic above to see which case it is.
