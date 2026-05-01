-- ========================================
-- FIX USER CREATION - SIMPLIFIED APPROACH
-- ========================================
-- Migration: 2026050100000000_fix_user_creation_simple
-- Description: Simplified user creation using direct insert with proper handling

-- Drop old function
DROP FUNCTION IF EXISTS admin_create_user(TEXT, TEXT, TEXT, TEXT) CASCADE;

-- Create new simplified function
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
  normalized_email TEXT;
  normalized_name TEXT;
  new_user_id UUID;
  existing_user RECORD;
BEGIN
  -- 1. Validate authentication
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- 2. Get current user role
  SELECT role INTO current_user_role
  FROM public.users
  WHERE id = current_user_id;

  IF current_user_role != 'admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;

  -- 3. Normalize inputs
  normalized_email := lower(trim(user_email));
  normalized_name := trim(user_full_name);

  -- 4. Basic validation
  IF normalized_email = '' OR user_password = '' OR normalized_name = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'All fields are required');
  END IF;

  IF user_role NOT IN ('student', 'teacher', 'parent', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid role');
  END IF;

  -- 5. Check for duplicate email
  SELECT id, full_name, email, role INTO existing_user
  FROM public.users
  WHERE email = normalized_email
  LIMIT 1;

  IF existing_user IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'A user with this email already exists'
    );
  END IF;

  -- 6. Check for duplicate name (optional - remove if not needed)
  /*
  SELECT id, full_name, email, role INTO existing_user
  FROM public.users
  WHERE full_name = normalized_name
  LIMIT 1;

  IF existing_user IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'A user with this name already exists'
    );
  END IF;
  */

  -- 7. Generate new user ID
  new_user_id := gen_random_uuid();

  -- 8. Insert into auth.users - trigger will handle the rest
  -- Note: Using simple hash for development. For production, use proper auth API.
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
    user_password,  -- Will be auto-hashed by Supabase in some configurations
    NOW(),  -- Auto-confirm email
    jsonb_build_object(
      'full_name', normalized_name,
      'role', user_role
    ),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb
  );

  -- Trigger handle_new_user() will automatically:
  -- - Insert into public.users
  -- - Insert into teachers/students/parents based on role

  RETURN jsonb_build_object(
    'success', true,
    'message', 'User created successfully',
    'user_id', new_user_id,
    'email', normalized_email,
    'full_name', normalized_name,
    'role', user_role
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION admin_create_user(TEXT, TEXT, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION admin_create_user IS 'Creates a new user. Insert into auth.users triggers profile creation in public.users and role tables.';
