-- ========================================
-- FIX EMAIL DUPLICATE CHECK
-- ========================================
-- Migration: 20240427000009_fix_email_check
-- Description: Fix email duplicate detection and cleanup

-- First, let's see what we have
-- Check for orphaned auth users (in auth but not in public)
-- and sync them

-- Improved sync function
CREATE OR REPLACE FUNCTION sync_all_auth_users()
RETURNS JSONB AS $$
DECLARE
  auth_user RECORD;
  sync_count INTEGER := 0;
  skipped_count INTEGER := 0;
BEGIN
  -- Loop through auth users and sync to public.users
  FOR auth_user IN
    SELECT au.id, au.email, au.raw_user_meta_data
    FROM auth.users au
    WHERE au.email_confirmed_at IS NOT NULL
  LOOP
    -- Check if already in public.users
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth_user.id) THEN
      -- Insert into public.users
      INSERT INTO public.users (id, email, role, full_name)
      VALUES (
        auth_user.id,
        auth_user.email,
        COALESCE(auth_user.raw_user_meta_data->>'role', 'student'),
        COALESCE(
          auth_user.raw_user_meta_data->>'full_name',
          split_part(auth_user.email, '@', 1)
        )
      )
      ON CONFLICT (id) DO NOTHING;

      sync_count := sync_count + 1;
    ELSE
      skipped_count := skipped_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'synced', sync_count,
    'skipped', skipped_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate public_signup with better error handling
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
BEGIN
  -- Validate inputs
  IF user_email IS NULL OR user_password IS NULL OR user_full_name IS NULL OR user_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Missing required fields');
  END IF;

  IF user_role NOT IN ('student', 'teacher', 'parent', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid role');
  END IF;

  -- Normalize email to lowercase
  normalized_email := lower(trim(user_email));

  -- Check if email already exists (more thorough check)
  IF EXISTS (
    SELECT 1 FROM public.users WHERE email = normalized_email
    LIMIT 1
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email already registered');
  END IF;

  -- Check auth.users directly for this email
  IF EXISTS (
    SELECT 1 FROM auth.users WHERE email = normalized_email
    LIMIT 1
  ) THEN
    -- Email exists in auth but not in public - this is an orphaned record
    -- Let's sync it first, then return error
    PERFORM sync_all_auth_users();

    -- Check again after sync
    IF EXISTS (
      SELECT 1 FROM public.users WHERE email = normalized_email
      LIMIT 1
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Email already registered');
    END IF;
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
  BEGIN
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
  EXCEPTION
    WHEN unique_violation THEN
      RETURN jsonb_build_object('success', false, 'error', 'Email already registered in auth system');
  END;

  -- Insert into public.users
  BEGIN
    INSERT INTO public.users (id, email, role, full_name)
    VALUES (new_user_id, normalized_email, user_role, user_full_name);
  EXCEPTION
    WHEN unique_violation THEN
      -- Rollback auth user creation
      DELETE FROM auth.users WHERE id = new_user_id;
      RETURN jsonb_build_object('success', false, 'error', 'Email already registered');
  END;

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
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run sync to fix any existing issues
SELECT sync_all_auth_users();
