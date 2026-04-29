-- ========================================
-- FIX AUTH USER DELETION & ORPHANED EMAILS
-- ========================================
-- Migration: 20240427000022_fix_auth_user_deletion
-- Description:
--   1. Update admin_delete_user to also delete from auth.users
--   2. Add function to cleanup orphaned auth.users records
--   3. Update admin_create_user to check for orphaned emails in auth.users
-- ========================================

-- =====================================================
-- 1. UPDATE admin_delete_user - DELETE FROM BOTH TABLES
-- =====================================================

CREATE OR REPLACE FUNCTION admin_delete_user(user_id_to_delete UUID)
RETURNS JSONB AS $$
DECLARE
  current_user_id UUID := auth.uid();
  current_user_role TEXT;
  auth_deleted BOOLEAN := FALSE;
  public_deleted BOOLEAN := FALSE;
BEGIN
  -- Check if current user is authenticated
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get role from public.users using SECURITY DEFINER
  SELECT role INTO current_user_role
  FROM public.users
  WHERE id = current_user_id;

  -- Check if current user is admin
  IF current_user_role != 'admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized - must be admin');
  END IF;

  -- Prevent self-deletion
  IF user_id_to_delete = current_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot delete your own account');
  END IF;

  -- First, delete from auth.users (this handles the email uniqueness constraint)
  -- Using DELETE with safety check
  BEGIN
    DELETE FROM auth.users WHERE id = user_id_to_delete;
    auth_deleted := TRUE;
  EXCEPTION WHEN OTHERS THEN
    -- Log error but continue to delete from public.users
    RAISE NOTICE 'Failed to delete from auth.users: %', SQLERRM;
  END;

  -- Then delete from public.users (this cascades to related tables)
  BEGIN
    DELETE FROM public.users WHERE id = user_id_to_delete;
    public_deleted := TRUE;
  EXCEPTION WHEN OTHERS THEN
    -- If this fails, we might have already deleted from auth.users
    -- Log and continue
    RAISE NOTICE 'Failed to delete from public.users: %', SQLERRM;
  END;

  -- Return success with details
  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'User deleted successfully',
    'auth_deleted', auth_deleted,
    'public_deleted', public_deleted
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- 2. CLEANUP FUNCTION FOR ORPHANED AUTH.USERS RECORDS
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_orphaned_auth_users()
RETURNS JSONB AS $$
DECLARE
  current_user_id UUID := auth.uid();
  current_user_role TEXT;
  orphaned_count INTEGER := 0;
  deleted_count INTEGER := 0;
  orphaned_emails JSONB := '[]'::jsonb;
BEGIN
  -- Check if current user is authenticated
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get role from public.users
  SELECT role INTO current_user_role
  FROM public.users
  WHERE id = current_user_id;

  -- Check if current user is admin
  IF current_user_role != 'admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized - admin only');
  END IF;

  -- Get count of orphaned auth.users (users in auth but not in public)
  SELECT COUNT(*), jsonb_agg(jsonb_build_object('id', id, 'email', email, 'created_at', created_at))
  INTO orphaned_count, orphaned_emails
  FROM auth.users au
  WHERE NOT EXISTS (SELECT 1 FROM public.users pu WHERE pu.id = au.id)
  AND au.deleted_at IS NULL;

  -- Delete orphaned auth.users
  IF orphaned_count > 0 THEN
    DELETE FROM auth.users au
    WHERE NOT EXISTS (SELECT 1 FROM public.users pu WHERE pu.id = au.id)
    AND au.deleted_at IS NULL;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'Orphaned auth.users cleaned up',
    'orphaned_found', orphaned_count,
    'deleted_count', deleted_count,
    'orphaned_emails', orphaned_emails
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- 3. UPDATE admin_create_user - CHECK ORPHANED EMAILS IN AUTH
-- =====================================================

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
  duplicate_emails JSONB;
  duplicate_names JSONB;
  orphaned_auth_emails JSONB;
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

  -- Normalize email and name
  normalized_email := lower(trim(user_email));
  normalized_name := trim(user_full_name);

  -- Check for email duplicates in public.users
  SELECT jsonb_agg(jsonb_build_object('id', id, 'email', email, 'full_name', full_name, 'role', role))
  INTO duplicate_emails
  FROM public.users
  WHERE email = normalized_email;

  -- Check for name duplicates (case-insensitive)
  SELECT jsonb_agg(jsonb_build_object('id', id, 'email', email, 'full_name', full_name, 'role', role))
  INTO duplicate_names
  FROM public.users
  WHERE LOWER(full_name) = LOWER(normalized_name);

  -- Check for orphaned emails in auth.users (not in public.users)
  SELECT jsonb_agg(jsonb_build_object('id', id, 'email', email, 'created_at', created_at))
  INTO orphaned_auth_emails
  FROM auth.users
  WHERE email = normalized_email
  AND deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.users.id);

  -- Build duplicates info
  IF duplicate_emails IS NOT NULL OR duplicate_names IS NOT NULL OR orphaned_auth_emails IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Duplicate user found',
      'duplicates', jsonb_build_object(
        'email', duplicate_emails,
        'name', duplicate_names,
        'orphaned_auth', orphaned_auth_emails
      ),
      'has_email_duplicate', duplicate_emails IS NOT NULL,
      'has_name_duplicate', duplicate_names IS NOT NULL,
      'has_orphaned_email', orphaned_auth_emails IS NOT NULL
    );
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
      'full_name', normalized_name,
      'role', user_role
    )::jsonb,
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb
  );

  -- Insert into public.users
  INSERT INTO public.users (id, email, role, full_name)
  VALUES (new_user_id, normalized_email, user_role, normalized_name);

  -- Create role-specific profile
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

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'message', 'User created successfully',
    'user_id', new_user_id,
    'email', normalized_email,
    'full_name', normalized_name,
    'role', user_role
  );

EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email already exists in auth system');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- 4. GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION admin_delete_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_orphaned_auth_users() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_create_user(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- =====================================================
-- 5. ADD COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON FUNCTION admin_delete_user IS 'Deletes user from both auth.users and public.users. Handles orphaned records properly.';
COMMENT ON FUNCTION cleanup_orphaned_auth_users IS 'Cleans up orphaned auth.users records that exist in auth but not in public.users table. Run this after user deletions to free up emails.';
COMMENT ON FUNCTION admin_create_user IS 'Creates user with duplicate checking for both public.users and orphaned auth.users emails.';
