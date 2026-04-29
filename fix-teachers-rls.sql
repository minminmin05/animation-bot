-- ========================================
-- FIX TEACHERS NOT SHOWING - Quick SQL Script
-- Run this in Supabase SQL Editor
-- ========================================

-- Enable all authenticated users to read users table (needed for teacher list join)
DROP POLICY IF EXISTS "users_read_own" ON users;
DROP POLICY IF EXISTS "users_admin_read_all" ON users;

CREATE POLICY "Allow authenticated to read users"
  ON users FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Verify teachers can be read
DROP POLICY IF EXISTS "teachers_read_all" ON teachers;
DROP POLICY IF EXISTS "teachers_update_own" ON teachers;
DROP POLICY IF EXISTS "teachers_admin_insert" ON teachers;
DROP POLICY IF EXISTS "teachers_admin_all" ON teachers;

CREATE POLICY "teachers_select_all" ON teachers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "teachers_insert_all" ON teachers
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "teachers_update_all" ON teachers
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "teachers_delete_all" ON teachers
  FOR DELETE TO authenticated USING (true);

-- Verification query
SELECT 'Teachers count:' as info, COUNT(*) as count FROM teachers
UNION ALL
SELECT 'Users with teacher role:', COUNT(*) FROM users WHERE role = 'teacher';
