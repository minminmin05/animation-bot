-- ========================================
-- SEED DATA (FOR TESTING/DEVELOPMENT)
-- ========================================
-- Migration: 20240427000004_seed_data
-- Description: Insert demo data for testing
-- NOTE: This is for development only. Skip for production.

-- IMPORTANT: Run this AFTER creating users in Supabase Authentication
-- This will create corresponding records in the users table

-- Backfill existing auth users to public.users table
INSERT INTO public.users (id, email, role, full_name)
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'role', 'admin'),
  COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1))
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;

-- Create demo admin user record (if auth user exists)
-- This assumes you have created admin@school.com in Supabase Auth
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Get the admin user ID from auth
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'admin@school.com'
  LIMIT 1;

  IF admin_user_id IS NOT NULL THEN
    -- Ensure user exists in public.users
    INSERT INTO public.users (id, email, role, full_name)
    VALUES (admin_user_id, 'admin@school.com', 'admin', 'Admin User')
    ON CONFLICT (id) DO UPDATE SET
      role = 'admin',
      full_name = 'Admin User';

    -- Create admin profile data if needed
    -- (Admins don't have a separate profile table)
  END IF;
END $$;

-- Create demo teacher user record
DO $$
DECLARE
  teacher_user_id UUID;
BEGIN
  SELECT id INTO teacher_user_id
  FROM auth.users
  WHERE email = 'teacher@school.com'
  LIMIT 1;

  IF teacher_user_id IS NOT NULL THEN
    INSERT INTO public.users (id, email, role, full_name)
    VALUES (teacher_user_id, 'teacher@school.com', 'teacher', 'Teacher User')
    ON CONFLICT (id) DO UPDATE SET
      role = 'teacher',
      full_name = 'Teacher User';

    -- Create teacher profile
    INSERT INTO teachers (user_id, name, subject, department, phone)
    VALUES (teacher_user_id, 'Teacher User', 'Mathematics', 'Science', '123-456-7890')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
END $$;

-- Create demo student user record
DO $$
DECLARE
  student_user_id UUID;
BEGIN
  SELECT id INTO student_user_id
  FROM auth.users
  WHERE email = 'student@school.com'
  LIMIT 1;

  IF student_user_id IS NOT NULL THEN
    INSERT INTO public.users (id, email, role, full_name)
    VALUES (student_user_id, 'student@school.com', 'student', 'Student User')
    ON CONFLICT (id) DO UPDATE SET
      role = 'student',
      full_name = 'Student User';

    -- Create student profile
    INSERT INTO students (user_id, name, class, grade_level)
    VALUES (student_user_id, 'Student User', '10A', 10)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
END $$;

-- Create demo parent user record
DO $$
DECLARE
  parent_user_id UUID;
BEGIN
  SELECT id INTO parent_user_id
  FROM auth.users
  WHERE email = 'parent@school.com'
  LIMIT 1;

  IF parent_user_id IS NOT NULL THEN
    INSERT INTO public.users (id, email, role, full_name)
    VALUES (parent_user_id, 'parent@school.com', 'parent', 'Parent User')
    ON CONFLICT (id) DO UPDATE SET
      role = 'parent',
      full_name = 'Parent User';

    -- Create parent profile
    INSERT INTO parents (user_id, name, phone)
    VALUES (parent_user_id, 'Parent User', '123-456-7890')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
END $$;
