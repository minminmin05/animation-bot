-- ========================================
-- FIX DUPLICATE EMAIL CHECK IN ADMIN CREATE USER
-- ========================================
-- Migration: 20240427000015_fix_duplicate_email_check
-- Description: Check auth.users BEFORE insert to prevent false duplicates

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
  auth_user_count INTEGER;
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

  -- Check if email already exists in public.users
  IF EXISTS (SELECT 1 FROM public.users WHERE email = normalized_email LIMIT 1) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email already exists');
  END IF;

  -- Check if email already exists in auth.users (THIS WAS MISSING!)
  SELECT COUNT(*) INTO auth_user_count
  FROM auth.users
  WHERE email = normalized_email
  AND deleted_at IS NULL;

  IF auth_user_count > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email already exists');
  END IF;

  -- Generate new user ID
  new_user_id := gen_random_uuid();

  -- Insert into auth.users with email_confirmed_at set to NOW()
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

  -- Return success
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

COMMENT ON FUNCTION admin_create_user IS 'Fixed: Now checks auth.users for duplicate email BEFORE insert';
