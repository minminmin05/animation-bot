-- ========================================
-- FIX INSTANCE_ID COLUMN REFERENCE
-- ========================================
-- Migration: 20240427000012_fix_instance_column
-- Description: Fix instance_id column issues in signup functions

-- First check what columns exist in auth.users
-- The issue is that we're trying to select instance_id but it might have a different name

-- Recreate public_signup with better instance_id handling
CREATE OR REPLACE FUNCTION public_signup(
  user_email TEXT,
  user_password TEXT,
  user_full_name TEXT,
  user_role TEXT
)
RETURNS JSONB AS $$
DECLARE
  new_user_id UUID;
  normalized_email TEXT;
  existing_auth_id UUID;
BEGIN
  -- Validate inputs
  IF user_email IS NULL OR user_password IS NULL OR user_full_name IS NULL OR user_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Missing required fields');
  END IF;

  IF user_role NOT IN ('student', 'teacher', 'parent', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid role');
  END IF;

  -- Normalize email
  normalized_email := lower(trim(user_email));

  -- First sync any orphaned auth records
  PERFORM sync_all_auth_users();

  -- Now check if email exists in public.users (after sync)
  IF EXISTS (
    SELECT 1 FROM public.users WHERE email = normalized_email
    LIMIT 1
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email already registered');
  END IF;

  -- Check if there's an orphaned auth record
  SELECT id INTO existing_auth_id
  FROM auth.users
  WHERE email = normalized_email
  LIMIT 1;

  -- If auth record exists, delete it so we can create fresh
  IF existing_auth_id IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = existing_auth_id;
  END IF;

  -- Generate new user ID
  new_user_id := gen_random_uuid();

  -- Insert into auth.users - let Supabase handle instance_id
  -- We'll insert with minimal required fields
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
    crypt(user_password, gen_salt('bf')),
    NOW(),
    jsonb_build_object(
      'full_name', user_full_name,
      'role', user_role
    )::jsonb,
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb
  );

  -- Insert into public.users
  INSERT INTO public.users (id, email, role, full_name)
  VALUES (new_user_id, normalized_email, user_role, user_full_name);

  -- Create role-specific profile
  IF user_role = 'teacher' THEN
    INSERT INTO teachers (user_id, name, subject)
    VALUES (new_user_id, user_full_name, 'Not assigned');
  ELSIF user_role = 'student' THEN
    INSERT INTO students (user_id, name, class, grade_level)
    VALUES (new_user_id, user_full_name, 'Unassigned', NULL);
  ELSIF user_role = 'parent' THEN
    INSERT INTO parents (user_id, name)
    VALUES (new_user_id, user_full_name);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Account created successfully',
    'user_id', new_user_id,
    'email', normalized_email
  );

EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email already registered');
  WHEN OTHERS THEN
    -- Log the error for debugging
    RAISE WARNING 'Signup error for %: %', normalized_email, SQLERRM;
    RETURN jsonb_build_object('success', false, 'error', 'Failed to create account. Please try again.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also fix admin_create_user with same issue
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
  IF user_email IS NULL OR user_password IS NULL OR user_full_name IS NULL OR user_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Missing required fields');
  END IF;

  IF user_role NOT IN ('student', 'teacher', 'parent', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid role');
  END IF;

  -- Check if email already exists
  IF EXISTS (SELECT 1 FROM public.users WHERE email = lower(user_email)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email already exists');
  END IF;

  -- Generate new user ID
  new_user_id := gen_random_uuid();

  -- Insert into auth.users - without instance_id
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
    lower(user_email),
    crypt(user_password, gen_salt('bf')),
    NOW(),
    jsonb_build_object(
      'full_name', user_full_name,
      'role', user_role
    )::jsonb,
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb
  );

  -- Insert into public.users
  INSERT INTO public.users (id, email, role, full_name)
  VALUES (new_user_id, lower(user_email), user_role, user_full_name);

  -- Create role-specific profile
  IF user_role = 'teacher' THEN
    INSERT INTO teachers (user_id, name, subject)
    VALUES (new_user_id, user_full_name, 'Not assigned');
  ELSIF user_role = 'student' THEN
    INSERT INTO students (user_id, name, class, grade_level)
    VALUES (new_user_id, user_full_name, 'Unassigned', NULL);
  ELSIF user_role = 'parent' THEN
    INSERT INTO parents (user_id, name)
    VALUES (new_user_id, user_full_name);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'User created successfully',
    'user_id', new_user_id,
    'email', lower(user_email)
  );

EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email already exists');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
