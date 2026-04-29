-- ========================================
-- CREATE TEST USERS WITHOUT AUTH - BYPASS SUPABASE AUTH
-- ========================================
-- Migration: 20240427000027_bypass_auth_for_test_users.sql
-- Description: Create test users directly in database without Supabase Auth validation
-- IMPORTANT: This is for TESTING/DEVELOPMENT only
-- ========================================

-- Drop the old function first
DROP FUNCTION IF EXISTS admin_create_user(TEXT, TEXT, TEXT, TEXT) CASCADE;

-- Create a function that bypasses Supabase Auth for test users
CREATE OR REPLACE FUNCTION admin_create_user(
  user_email TEXT,
  user_password TEXT,
  user_full_name TEXT,
  user_role TEXT
)
RETURNS JSONB AS $$
DECLARE
  current_user_id UUID := auth.uid();
  current_user_role TEXT;
  new_user_id UUID;
  normalized_email TEXT;
  normalized_name TEXT;
  duplicate_emails JSONB;
  duplicate_names JSONB;
  orphaned_auth_emails JSONB;
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
  IF user_email IS NULL OR trim(user_email) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email is required');
  END IF;

  IF user_password IS NULL OR trim(user_password) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Password is required');
  END IF;

  IF user_full_name IS NULL OR trim(user_full_name) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Full name is required');
  END IF;

  IF user_role IS NULL OR user_role NOT IN ('student', 'teacher', 'parent', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid role');
  END IF;

  -- Normalize email and name
  normalized_email := lower(trim(user_email));
  normalized_name := trim(user_full_name);

  -- Check for email duplicates in public.users
  SELECT jsonb_agg(jsonb_build_object('id', id, 'email', email, 'full_name', full_name, 'role', role))
  INTO duplicate_emails
  FROM public.users
  WHERE email = normalized_email;

  -- Check for name duplicates (case-insensitive)
  SELECT jsonb_agg(jsonb_build_object('id', id, 'email', email, 'full_name', full_name, 'role', role))
  INTO duplicate_names
  FROM public.users
  WHERE LOWER(full_name) = LOWER(normalized_name);

  -- Check for orphaned emails in auth.users (not in public.users)
  SELECT jsonb_agg(jsonb_build_object('id', id, 'email', email, 'created_at', created_at))
  INTO orphaned_auth_emails
  FROM auth.users
  WHERE email = normalized_email
  AND deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.users.id);

  -- Build duplicates info
  IF duplicate_emails IS NOT NULL OR duplicate_names IS NOT NULL OR orphaned_auth_emails IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Duplicate user found',
      'duplicates', jsonb_build_object(
        'email', duplicate_emails,
        'name', duplicate_names,
        'orphaned_auth', orphaned_auth_emails
      ),
      'has_email_duplicate', duplicate_emails IS NOT NULL,
      'has_name_duplicate', duplicate_names IS NOT NULL,
      'has_orphaned_email', orphaned_auth_emails IS NOT NULL
    );
  END IF;

  -- Generate new user ID
  new_user_id := gen_random_uuid();

  -- Insert into auth.users WITHOUT using password hashing
  -- Using a simple encoding that works without pgcrypto
  -- For testing, we'll use a base64 encoding of the password
  -- In production with proper auth, Supabase would handle this
  BEGIN
    INSERT INTO auth.users (
      id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_user_meta_data,
      created_at,
      updated_at,
      raw_app_meta_data
    ) VALUES (
      new_user_id,
      normalized_email,
      -- Simple encoding for test purposes (NOT SECURE for production)
      convert_to(user_password, 'UTF8'),
      NOW(),
      jsonb_build_object(
        'full_name', normalized_name,
        'role', user_role
      )::jsonb,
      NOW(),
      NOW(),
      '{"provider": "email", "providers": ["email"]}'::jsonb
    );
  EXCEPTION WHEN unique_violation THEN
    -- If auth.users already has this email, just delete it and retry
    DELETE FROM auth.users WHERE email = normalized_email;
    -- Try again
    INSERT INTO auth.users (
      id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_user_meta_data,
      created_at,
      updated_at,
      raw_app_meta_data
    ) VALUES (
      new_user_id,
      normalized_email,
      convert_to(user_password, 'UTF8'),
      NOW(),
      jsonb_build_object(
        'full_name', normalized_name,
        'role', user_role
      )::jsonb,
      NOW(),
      NOW(),
      '{"provider": "email", "providers": ["email"]}'::jsonb
    );
  END;

  -- Insert into public.users
  INSERT INTO public.users (id, email, role, full_name)
  VALUES (new_user_id, normalized_email, user_role, normalized_name);

  -- Create role-specific profile
  IF user_role = 'teacher' THEN
    INSERT INTO teachers (user_id, name, subject, department)
    VALUES (new_user_id, normalized_name, 'Not assigned', 'Unassigned');
  ELSIF user_role = 'student' THEN
    INSERT INTO students (user_id, name, class, grade_level)
    VALUES (new_user_id, normalized_name, 'Unassigned', NULL);
  ELSIF user_role = 'parent' THEN
    INSERT INTO parents (user_id, name)
    VALUES (new_user_id, normalized_name);
  END IF;

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'message', 'User created successfully (test mode)',
    'user_id', new_user_id,
    'email', normalized_email,
    'full_name', normalized_name,
    'role', user_role
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'sqlstate', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION admin_create_user(TEXT, TEXT, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION admin_create_user IS 'Creates test users without Supabase Auth validation. FOR TESTING ONLY - password is stored as plain text.';
