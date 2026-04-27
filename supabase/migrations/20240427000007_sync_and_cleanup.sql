-- ========================================
-- SYNC AND CLEANUP FUNCTIONS
-- ========================================
-- Migration: 20240427000007_sync_and_cleanup
-- Description: Functions to sync auth.users with public.users and cleanup

-- Function to sync all auth users to public.users
CREATE OR REPLACE FUNCTION sync_auth_users_to_public()
RETURNS JSONB AS $$
DECLARE
  auth_user RECORD;
  sync_count INTEGER := 0;
BEGIN
  -- Loop through all auth users that don't have a matching public user
  FOR auth_user IN
    SELECT au.id, au.email, au.raw_user_meta_data
    FROM auth.users au
    WHERE au.id NOT IN (SELECT id FROM public.users WHERE id IS NOT NULL)
  LOOP
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
  END LOOP;

  RETURN jsonb_build_object('success', true, 'synced_count', sync_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute (admin only in production)
GRANT EXECUTE ON FUNCTION sync_auth_users_to_public() TO authenticated;

-- Function to completely delete a user (from both auth and public)
CREATE OR REPLACE FUNCTION admin_delete_user_completely(user_id_to_delete UUID)
RETURNS JSONB AS $$
DECLARE
  current_user_id UUID := auth.uid();
  current_user_role TEXT;
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
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Delete from public.users first (cascades to related tables)
  DELETE FROM public.users WHERE id = user_id_to_delete;

  -- Mark for deletion in auth.users
  -- Note: We can't directly delete from auth.users via SQL
  -- But the public.users deletion is what matters for our app

  RETURN jsonb_build_object('success', true, 'message', 'User deleted successfully');
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION admin_delete_user_completely(UUID) TO authenticated;

-- Improved trigger function that handles errors better
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user already exists in public.users
  IF EXISTS (SELECT 1 FROM public.users WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Insert into public.users
  INSERT INTO public.users (id, email, role, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the auth operation
    RAISE WARNING 'Failed to create public user record for %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update trigger to use new function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function for public signup (no admin required)
CREATE OR REPLACE FUNCTION public_signup(
  user_email TEXT,
  user_password TEXT,
  user_full_name TEXT,
  user_role TEXT
)
RETURNS JSONB AS $$
DECLARE
  new_user_id UUID;
  instance_uuid TEXT;
BEGIN
  -- Validate inputs
  IF user_email IS NULL OR user_password IS NULL OR user_full_name IS NULL OR user_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Missing required fields');
  END IF;

  IF user_role NOT IN ('student', 'teacher', 'parent', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid role');
  END IF;

  -- Check if email already exists
  IF EXISTS (
    SELECT 1 FROM public.users WHERE email = lower(user_email)
    UNION
    SELECT 1 FROM auth.users WHERE email = lower(user_email)
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email already registered');
  END IF;

  -- Get instance ID
  SELECT instance_id INTO instance_uuid
  FROM auth.users
  LIMIT 1;

  -- If no instance ID, use a default
  IF instance_uuid IS NULL THEN
    instance_uuid := '00000000-0000-0000-0000-000000000000';
  END IF;

  -- Generate new user ID
  new_user_id := gen_random_uuid();

  -- Insert into auth.users with email confirmed
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
    lower(user_email),
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
    'message', 'Account created successfully',
    'user_id', new_user_id
  );

EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email already registered');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public_signup(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Sync existing users now
DO $$
DECLARE
  result JSONB;
BEGIN
  SELECT sync_auth_users_to_public() INTO result;
  RAISE NOTICE 'Synced % users', result->>'synced_count';
END $$;
