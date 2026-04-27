-- ========================================
-- FIX SIGNUP WITH ORPHANED AUTH RECORDS
-- ========================================
-- Migration: 20240427000011_fix_signup_orphan
-- Description: Handle orphaned auth.users records during signup

-- Improved signup function that handles orphaned auth records
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

  -- Check if there's an orphaned auth record and get its ID
  SELECT id INTO existing_auth_id
  FROM auth.users
  WHERE email = normalized_email
  LIMIT 1;

  -- If auth record exists, we'll reuse it; otherwise create new
  IF existing_auth_id IS NOT NULL THEN
    -- Delete the orphaned auth record so we can create a fresh one
    DELETE FROM auth.users WHERE id = existing_auth_id;
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
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up orphaned auth records (optional - use with caution)
CREATE OR REPLACE FUNCTION cleanup_orphaned_auth_records()
RETURNS JSONB AS $$
DECLARE
  deleted_count INTEGER := 0;
  auth_user RECORD;
BEGIN
  -- Delete auth records that have no corresponding public.user
  -- AND were created more than 1 hour ago (to avoid race conditions)
  FOR auth_user IN
    SELECT au.id, au.email
    FROM auth.users au
    WHERE NOT EXISTS (
      SELECT 1 FROM public.users pu WHERE pu.id = au.id
    )
    AND au.created_at < NOW() - INTERVAL '1 hour'
  LOOP
    DELETE FROM auth.users WHERE id = auth_user.id;
    deleted_count := deleted_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_count', deleted_count,
    'message', 'Cleaned up ' || deleted_count || ' orphaned auth records'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute
GRANT EXECUTE ON FUNCTION cleanup_orphaned_auth_records() TO authenticated;

-- Run cleanup (optional - comment out if you want to keep old records)
-- SELECT cleanup_orphaned_auth_records();
