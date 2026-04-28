-- ========================================
-- FIX TEACHERS TABLE RLS POLICIES
-- ========================================
-- Migration: 20240427000018_fix_teachers_rls
-- Description: Ensure admins can read teachers and fix potential join issues

-- First, check existing policies
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'teachers';

  RAISE NOTICE 'Found % policies on teachers table', policy_count;
END $$;

-- Drop existing SELECT policies on teachers to avoid conflicts
DROP POLICY IF EXISTS "Teachers can view own profile" ON teachers;
DROP POLICY IF EXISTS "Authenticated users can view teachers" ON teachers;
DROP POLICY IF EXISTS "Teachers can view own profile" ON teachers;

-- Create new simplified policies
-- Allow all authenticated users to read teachers (needed for joins to work)
CREATE POLICY "Allow authenticated to read teachers"
  ON teachers FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Allow service role to bypass RLS (for development/admin operations)
-- This allows admins to read all teachers when using service_role key
CREATE POLICY "Allow service role full access to teachers"
  ON teachers FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Also ensure users table has permissive policies for development
DROP POLICY IF EXISTS "Allow all authenticated to view users" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;

CREATE POLICY "Allow authenticated to read users"
  ON users FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow service role full access to users"
  ON users FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Comment: For production, you should restrict these policies to only allow admins
-- to read all teachers, and teachers to only read their own profile.
