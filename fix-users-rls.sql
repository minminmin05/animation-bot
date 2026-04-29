-- FIX: Allow authenticated users to read users table (needed for teacher list join)
-- Run this in Supabase SQL Editor

DROP POLICY IF EXISTS "users_read_own" ON users;
DROP POLICY IF EXISTS "users_admin_read_all" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_admin_update" ON users;
DROP POLICY IF EXISTS "users_insert_signup" ON users;
DROP POLICY IF EXISTS "users_admin_insert" ON users;
DROP POLICY IF EXISTS "users_admin_delete" ON users;

CREATE POLICY "Allow authenticated to read users" ON users FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated to insert users" ON users FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated to update users" ON users FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated to delete users" ON users FOR DELETE USING (auth.uid() IS NOT NULL);

-- Verify
SELECT 'Users table policies:' as info, policyname, cmd FROM pg_policies WHERE tablename = 'users';
