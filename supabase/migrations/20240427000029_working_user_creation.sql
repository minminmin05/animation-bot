-- ========================================
-- WORKING USER CREATION - RUN THIS
-- ========================================

-- First, enable the uuid extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop old function
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
  new_user_id UUID;
  normalized_email TEXT;
BEGIN
  -- Check admin
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = current_user_id AND role = 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Validate
  normalized_email := lower(trim(user_email));

  IF normalized_email = '' OR user_password = '' OR trim(user_full_name) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'All fields required');
  END IF;

  IF user_role NOT IN ('student', 'teacher', 'parent', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid role');
  END IF;

  -- Delete any existing user with this email (both auth and public)
  DELETE FROM public.users WHERE email = normalized_email;
  DELETE FROM auth.users WHERE email = normalized_email;

  -- Create new user
  new_user_id := gen_random_uuid();

  INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at,
    raw_user_meta_data, created_at, updated_at, raw_app_meta_data
  ) VALUES (
    new_user_id,
    normalized_email,
    convert_to(user_password, 'UTF8'),
    NOW(),
    jsonb_build_object('full_name', trim(user_full_name), 'role', user_role),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb
  );

  INSERT INTO public.users (id, email, role, full_name)
  VALUES (new_user_id, normalized_email, user_role, trim(user_full_name));

  IF user_role = 'teacher' THEN
    INSERT INTO teachers (user_id, name, subject, department)
    VALUES (new_user_id, trim(user_full_name), 'Not assigned', 'Unassigned');
  ELSIF user_role = 'student' THEN
    INSERT INTO students (user_id, name, class, grade_level)
    VALUES (new_user_id, trim(user_full_name), 'Unassigned', NULL);
  ELSIF user_role = 'parent' THEN
    INSERT INTO parents (user_id, name)
    VALUES (new_user_id, trim(user_full_name));
  END IF;

  RETURN jsonb_build_object('success', true, 'user_id', new_user_id, 'email', normalized_email);

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION admin_create_user(TEXT, TEXT, TEXT, TEXT) TO authenticated;
