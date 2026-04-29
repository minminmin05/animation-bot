-- ========================================
-- FIX RLS POLICIES - SIMPLIFIED FOR DEVELOPMENT
-- ========================================
-- Migration: 20240427000020_fix_user_management_rls
-- Description: Fix circular dependency in RLS policies by allowing all authenticated users to read/write

-- =====================================================
-- 1. FIX admin_get_all_users FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION admin_get_all_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
DECLARE
  current_user_id UUID := auth.uid();
  current_user_role TEXT;
BEGIN
  -- Check if current user is authenticated
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get role from public.users using SECURITY DEFINER (bypasses RLS)
  SELECT role INTO current_user_role
  FROM public.users
  WHERE id = current_user_id;

  -- Check if current user is admin
  IF current_user_role != 'admin' THEN
    RAISE EXCEPTION 'Not authorized - must be admin';
  END IF;

  -- Return all users
  RETURN QUERY
  SELECT u.id, u.email, u.full_name, u.role, u.created_at, u.updated_at
  FROM public.users u
  ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- 2. FIX admin_update_role FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION admin_update_role(user_id_to_update UUID, new_role TEXT)
RETURNS JSONB AS $$
DECLARE
  current_user_id UUID := auth.uid();
  current_user_role TEXT;
BEGIN
  -- Check if current user is authenticated
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get role from public.users using SECURITY DEFINER
  SELECT role INTO current_user_role
  FROM public.users
  WHERE id = current_user_id;

  -- Check if current user is admin
  IF current_user_role != 'admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized - must be admin');
  END IF;

  -- Validate role
  IF new_role NOT IN ('student', 'teacher', 'parent', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid role');
  END IF;

  -- Prevent admin from removing their own admin role
  IF user_id_to_update = current_user_id AND new_role != 'admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot remove your own admin role');
  END IF;

  -- Update user role
  UPDATE public.users
  SET role = new_role, updated_at = NOW()
  WHERE id = user_id_to_update;

  RETURN jsonb_build_object('success', true, 'message', 'Role updated successfully');
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- 3. FIX admin_delete_user FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION admin_delete_user(user_id_to_delete UUID)
RETURNS JSONB AS $$
DECLARE
  current_user_id UUID := auth.uid();
  current_user_role TEXT;
BEGIN
  -- Check if current user is authenticated
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get role from public.users using SECURITY DEFINER
  SELECT role INTO current_user_role
  FROM public.users
  WHERE id = current_user_id;

  -- Check if current user is admin
  IF current_user_role != 'admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized - must be admin');
  END IF;

  -- Prevent self-deletion
  IF user_id_to_delete = current_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot delete your own account');
  END IF;

  -- Delete from public.users (this cascades to related tables)
  DELETE FROM public.users WHERE id = user_id_to_delete;

  RETURN jsonb_build_object('success', true, 'message', 'User deleted successfully');
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- 4. SIMPLIFY ALL RLS POLICIES - DEVELOPMENT MODE
-- =====================================================

-- Drop ALL existing policies from key tables
DO $$
DECLARE r record;
BEGIN
  -- Users table
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON users', r.policyname);
  END LOOP;

  -- Students table
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'students'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON students', r.policyname);
  END LOOP;

  -- Teachers table
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'teachers'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON teachers', r.policyname);
  END LOOP;

  -- Parents table
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'parents'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON parents', r.policyname);
  END LOOP;

  RAISE NOTICE 'All existing policies dropped';
END $$;

-- Create simplified policies for USERS table
CREATE POLICY "users_select_all" ON users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "users_insert_own" ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "users_update_own" ON users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Create simplified policies for STUDENTS table
CREATE POLICY "students_select_all" ON students
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "students_insert_all" ON students
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "students_update_all" ON students
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "students_delete_all" ON students
  FOR DELETE
  TO authenticated
  USING (true);

-- Create simplified policies for TEACHERS table
CREATE POLICY "teachers_select_all" ON teachers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "teachers_insert_all" ON teachers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "teachers_update_all" ON teachers
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "teachers_delete_all" ON teachers
  FOR DELETE
  TO authenticated
  USING (true);

-- Create simplified policies for PARENTS table
CREATE POLICY "parents_select_all" ON parents
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "parents_insert_all" ON parents
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "parents_update_all" ON parents
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "parents_delete_all" ON parents
  FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT
  tablename,
  COUNT(*) as policy_count,
  STRING_AGG(policyname, ', ' ORDER BY policyname) as policies
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('users', 'students', 'teachers', 'parents')
GROUP BY tablename
ORDER BY tablename;
