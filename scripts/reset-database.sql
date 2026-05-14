-- ========================================
-- RESET DATABASE - Delete all users safely
-- ========================================
-- Run in Supabase Dashboard → SQL Editor

-- Disable triggers temporarily
SET session_replication_role = 'replica';

-- Delete in correct order (respecting foreign keys)
DELETE FROM attendance;
DELETE FROM grades;
DELETE FROM student_enrollments;
DELETE FROM student_parent_relations;

DELETE FROM assignments;
DELETE FROM classes;

DELETE FROM students;
DELETE FROM teachers;
DELETE FROM parents;

DELETE FROM notifications;
DELETE FROM public.users;

-- Delete from auth.users (use TRUNCATE to avoid FK issues)
TRUNCATE TABLE auth.users CASCADE;

-- Re-enable triggers
SET session_replication_role = 'DEFAULT';

-- Verify all deleted
SELECT 'All users deleted!' as status,
       (SELECT COUNT(*) FROM public.users) as public_count,
       (SELECT COUNT(*) FROM auth.users) as auth_count;
