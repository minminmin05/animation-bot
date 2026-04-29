-- ========================================
-- FIX ADMIN CREATE USER - SIMPLIFIED APPROACH
-- ========================================
-- Migration: 20240427000026_fix_admin_create_client_api
-- Description: Create user profile in public.users only (auth user created via client SDK)
--
-- This approach removes direct auth.users manipulation entirely.
-- The frontend will use Supabase Auth API to create the auth user first,
-- then this function creates the profile.
-- ========================================

-- First, create a function that ONLY creates the profile (not the auth user)
-- The auth user should be created using Supabase client SDK first
CREATE OR REPLACE FUNCTION admin_create_user_profile(
  user_id UUID,
  user_role TEXT,
  user_full_name TEXT
)
RETURNS JSONB AS $$
DECLARE
  current_user_id UUID := auth.uid();
  current_user_role TEXT;
  existing_user users%ROWTYPE;
BEGIN
  -- Check if current user is authenticated
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get current user's role
  SELECT role INTO current_user_role
  FROM public.users
  WHERE id = current_user_id;

  -- Check if current user is admin
  IF current_user_role != 'admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized - admin only');
  END IF;

  -- Validate inputs
  IF user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User ID is required');
  END IF;

  IF user_role IS NULL OR user_role NOT IN ('student', 'teacher', 'parent', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid role');
  END IF;

  IF user_full_name IS NULL OR trim(user_full_name) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Full name is required');
  END IF;

  -- Check if auth user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user_id AND deleted_at IS NULL) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Auth user not found. Please create the auth user first.');
  END IF;

  -- Check if profile already exists
  SELECT * INTO existing_user FROM public.users WHERE id = user_id;
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User profile already exists');
  END IF;

  -- Get email from auth.users
  DECLARE
    user_email TEXT;
  BEGIN
    SELECT email INTO user_email FROM auth.users WHERE id = user_id;
  END;

  -- Insert into public.users
  INSERT INTO public.users (id, email, role, full_name)
  VALUES (user_id, user_email, user_role, trim(user_full_name));

  -- Create role-specific profile
  IF user_role = 'teacher' THEN
    INSERT INTO teachers (user_id, name, subject, department)
    VALUES (user_id, trim(user_full_name), 'Not assigned', 'Unassigned');
  ELSIF user_role = 'student' THEN
    INSERT INTO students (user_id, name, class, grade_level)
    VALUES (user_id, trim(user_full_name), 'Unassigned', NULL);
  ELSIF user_role = 'parent' THEN
    INSERT INTO parents (user_id, name)
    VALUES (user_id, trim(user_full_name));
  END IF;

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'message', 'User profile created successfully',
    'user_id', user_id,
    'email', user_email,
    'full_name', trim(user_full_name),
    'role', user_role
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION admin_create_user_profile(UUID, TEXT, TEXT) TO authenticated;

-- Also create a wrapper that tries the old way but falls back gracefully
CREATE OR REPLACE FUNCTION admin_create_user(
  user_email TEXT,
  user_password TEXT,
  user_full_name TEXT,
  user_role TEXT
)
RETURNS JSONB AS $$
BEGIN
  -- This function now returns instructions to use the client SDK
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Please use the updated user creation flow. The system has been updated.',
    'instructions', 'Use: admin_create_user_profile after creating auth user via Supabase Auth API',
    'migration_required', true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION admin_create_user(TEXT, TEXT, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION admin_create_user_profile IS 'Creates user profile after auth user is created via Supabase Auth API. Call this with the user_id returned from auth.signup().';
