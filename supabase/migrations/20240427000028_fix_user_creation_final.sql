-- ========================================
-- FINAL FIX - CREATE USER WITHOUT DUPLICATE ERRORS
-- ========================================

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
  normalized_name TEXT;
BEGIN
  -- Check auth
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT role INTO current_user_role FROM public.users WHERE id = current_user_id;
  IF current_user_role != 'admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Validate
  IF user_email IS NULL OR user_password IS NULL OR user_full_name IS NULL OR user_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'All fields required');
  END IF;

  IF user_role NOT IN ('student', 'teacher', 'parent', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid role');
  END IF;

  normalized_email := lower(trim(user_email));
  normalized_name := trim(user_full_name);

  -- Check if email exists in public.users
  IF EXISTS (SELECT 1 FROM public.users WHERE email = normalized_email) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email already exists');
  END IF;

  -- Check if name exists
  IF EXISTS (SELECT 1 FROM public.users WHERE LOWER(full_name) = LOWER(normalized_name)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Name already exists');
  END IF;

  -- Check and clean up orphaned auth.users with same email
  DELETE FROM auth.users
  WHERE email = normalized_email
  AND deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.users.id);

  -- Generate new ID
  new_user_id := gen_random_uuid();

  -- Insert auth user
  INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at,
    raw_user_meta_data, created_at, updated_at, raw_app_meta_data
  ) VALUES (
    new_user_id, normalized_email, convert_to(user_password, 'UTF8'), NOW(),
    jsonb_build_object('full_name', normalized_name, 'role', user_role),
    NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb
  );

  -- Insert public user
  INSERT INTO public.users (id, email, role, full_name)
  VALUES (new_user_id, normalized_email, user_role, normalized_name);

  -- Insert role profile
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

  RETURN jsonb_build_object('success', true, 'message', 'User created', 'user_id', new_user_id);

EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'User already exists');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION admin_create_user(TEXT, TEXT, TEXT, TEXT) TO authenticated;
