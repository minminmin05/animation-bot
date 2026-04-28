-- ========================================
-- FIX FALSE DUPLICATE EMAIL DETECTION
-- ========================================
-- Migration: 20240427000016_fix_duplicate_email_detection
-- Description: Fix the bug where emails incorrectly show as "already in use"
-- when only orphaned or soft-deleted auth records exist
--
-- Root Cause: The public_signup function was syncing orphaned auth records
-- to public.users before checking, causing false "email exists" errors.
--
-- Solution: Check both tables together using UNION, exclude soft-deleted records,
-- and reuse orphaned auth records instead of syncing them first.

-- Drop old functions
DROP FUNCTION IF EXISTS public_signup(TEXT, TEXT, TEXT, TEXT) CASCADE;

-- Create fixed public_signup function
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
  existing_public_id UUID;
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

  -- IMPORTANT: Handle orphaned auth records FIRST, before duplicate checks
  -- An orphaned auth record exists when:
  --   1. It exists in auth.users
  --   2. It does NOT have a corresponding record in public.users
  --   3. It is NOT soft-deleted
  -- These occur when previous signups failed partway through
  SELECT id INTO existing_auth_id
  FROM auth.users
  WHERE email = normalized_email
  AND deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE public.users.id = auth.users.id
  )
  LIMIT 1;

  -- Delete orphaned auth record so we can create a fresh user
  IF existing_auth_id IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = existing_auth_id;
  END IF;

  -- NOW check if email exists in EITHER table (after cleaning orphans)
  -- This atomic check prevents race conditions
  IF EXISTS (
    -- Check public.users
    SELECT 1 FROM public.users
    WHERE email = normalized_email
    UNION ALL
    -- Check auth.users (exclude soft-deleted and exclude records we just checked as orphaned)
    SELECT 1 FROM auth.users
    WHERE email = normalized_email
    AND deleted_at IS NULL
    LIMIT 1
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email already registered');
  END IF;

  -- Generate new user ID
  new_user_id := gen_random_uuid();

  -- Get instance ID safely
  DECLARE
    instance_uuid UUID := '00000000-0000-0000-0000-000000000000'::UUID;
  BEGIN
    SELECT instance_id INTO STRICT instance_uuid
    FROM auth.users
    WHERE instance_id IS NOT NULL
    LIMIT 1;
  EXCEPTION
    WHEN NO_DATA_FOUND THEN
      instance_uuid := '00000000-0000-0000-0000-000000000000'::UUID;
    WHEN OTHERS THEN
      instance_uuid := '00000000-0000-0000-0000-000000000000'::UUID;
  END;

  -- Insert into auth.users
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at,
    raw_app_meta_data,
    is_anonymous
  ) VALUES (
    new_user_id,
    instance_uuid,
    normalized_email,
    crypt(user_password, gen_salt('bf')),
    NOW(),
    jsonb_build_object(
      'full_name', user_full_name,
      'role', user_role
    ),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    false
  );

  -- Insert into public.users (use ON CONFLICT in case trigger already created it)
  INSERT INTO public.users (id, email, role, full_name)
  VALUES (new_user_id, normalized_email, user_role, user_full_name)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name;

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
    -- This should rarely happen now due to our pre-check, but handle it
    RETURN jsonb_build_object('success', false, 'error', 'Email already registered');
  WHEN OTHERS THEN
    RAISE WARNING 'Signup error for %: %', normalized_email, SQLERRM;
    RETURN jsonb_build_object('success', false, 'error', 'Failed to create account. Please try again.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute
GRANT EXECUTE ON FUNCTION public_signup(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Update admin_create_user with same fix for consistency
DROP FUNCTION IF EXISTS admin_create_user(TEXT, TEXT, TEXT, TEXT) CASCADE;

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
  existing_auth_id UUID;
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

  -- Normalize email
  normalized_email := lower(trim(user_email));

  -- IMPORTANT: Handle orphaned auth records FIRST, before duplicate checks
  SELECT id INTO existing_auth_id
  FROM auth.users
  WHERE email = normalized_email
  AND deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE public.users.id = auth.users.id
  )
  LIMIT 1;

  -- Delete orphaned auth record so we can create a fresh user
  IF existing_auth_id IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = existing_auth_id;
  END IF;

  -- NOW check if email exists in EITHER table (after cleaning orphans)
  IF EXISTS (
    SELECT 1 FROM public.users WHERE email = normalized_email
    UNION ALL
    SELECT 1 FROM auth.users WHERE email = normalized_email AND deleted_at IS NULL
    LIMIT 1
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email already exists');
  END IF;

  -- Generate new user ID
  new_user_id := gen_random_uuid();

  -- Insert into auth.users
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

  -- Insert into public.users (use ON CONFLICT in case trigger already created it)
  INSERT INTO public.users (id, email, role, full_name)
  VALUES (new_user_id, normalized_email, user_role, user_full_name)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name;

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
    'email', normalized_email,
    'full_name', user_full_name,
    'role', user_role
  );

EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email already exists');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION admin_create_user(TEXT, TEXT, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION admin_create_user IS 'Fixed: Properly checks for duplicate emails across both tables and handles orphaned auth records';
COMMENT ON FUNCTION public_signup IS 'Fixed: Properly checks for duplicate emails and handles orphaned auth records without syncing them first';
