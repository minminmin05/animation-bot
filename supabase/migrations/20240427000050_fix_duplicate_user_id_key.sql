-- ========================================
-- FIX DUPLICATE KEY ERROR IN USER CREATION
-- ========================================
-- Migration: 20240427000050_fix_duplicate_user_id_key
-- Description: Fix admin_create_user to avoid duplicate inserts when trigger already creates role profiles

-- The handle_new_user() trigger (from migration 00049) already creates role-specific profiles
-- when inserting into auth.users. This update prevents duplicate insert errors.

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
  normalized_name TEXT;
  existing_user RECORD;
BEGIN
  -- Check admin
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = current_user_id AND role = 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Normalize inputs
  normalized_email := lower(trim(user_email));
  normalized_name := trim(user_full_name);

  -- Basic validation
  IF normalized_email = '' OR user_password = '' OR normalized_name = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'All fields required');
  END IF;

  IF user_role NOT IN ('student', 'teacher', 'parent', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid role');
  END IF;

  -- Check for duplicate email
  SELECT id, full_name, email, role INTO existing_user
  FROM public.users
  WHERE email = normalized_email
  LIMIT 1;

  IF existing_user IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'A user with this email already exists',
      'existing_user', jsonb_build_object(
        'id', existing_user.id,
        'full_name', existing_user.full_name,
        'email', existing_user.email,
        'role', existing_user.role
      )
    );
  END IF;

  -- Check for duplicate name
  SELECT id, full_name, email, role INTO existing_user
  FROM public.users
  WHERE full_name = normalized_name
  LIMIT 1;

  IF existing_user IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'A user with this name already exists',
      'existing_user', jsonb_build_object(
        'id', existing_user.id,
        'full_name', existing_user.full_name,
        'email', existing_user.email,
        'role', existing_user.role
      )
    );
  END IF;

  -- Generate new user ID
  new_user_id := gen_random_uuid();

  -- Insert into auth.users - trigger will sync to public.users and role-specific tables automatically
  INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at,
    raw_user_meta_data, created_at, updated_at, raw_app_meta_data
  ) VALUES (
    new_user_id,
    normalized_email,
    convert_to(user_password, 'UTF8'),
    NOW(),
    jsonb_build_object('full_name', normalized_name, 'role', user_role),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb
  );

  -- Note: No need to insert into role-specific tables here.
  -- The handle_new_user() trigger (migration 00049) already handles:
  -- - public.users insert
  -- - teachers/students/parents insert (with ON CONFLICT DO NOTHING)

  RETURN jsonb_build_object('success', true, 'user_id', new_user_id, 'email', normalized_email);

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION admin_create_user(TEXT, TEXT, TEXT, TEXT) TO authenticated;
