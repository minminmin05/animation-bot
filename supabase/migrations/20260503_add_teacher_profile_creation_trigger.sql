-- ============================================
-- Add automatic teacher profile creation
-- Date: 2026-05-03
-- Description:
--   1. Updates handle_new_user() function to create teacher profiles
--   2. Syncs existing users with role='teacher' to teachers table
--   3. Also handles student and parent profiles for consistency
-- ============================================

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create the enhanced handle_new_user() function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
  user_name TEXT;
BEGIN
  -- Extract role and name from metadata
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
  user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));

  -- Ensure role is valid
  IF user_role NOT IN ('student', 'teacher', 'parent', 'admin') THEN
    user_role := 'student';
  END IF;

  -- Insert into public.users
  INSERT INTO public.users (id, email, role, full_name)
  VALUES (NEW.id, NEW.email, user_role, user_name)
  ON CONFLICT (id) DO NOTHING;

  -- Create role-specific profile
  IF user_role = 'teacher' THEN
    INSERT INTO teachers (user_id, name, subject, department)
    VALUES (NEW.id, user_name, 'Not assigned', 'Unassigned')
    ON CONFLICT (user_id) DO NOTHING;
  ELSIF user_role = 'student' THEN
    INSERT INTO students (user_id, name, class, grade_level)
    VALUES (NEW.id, user_name, 'Unassigned', NULL)
    ON CONFLICT (user_id) DO NOTHING;
  ELSIF user_role = 'parent' THEN
    INSERT INTO parents (user_id, name)
    VALUES (NEW.id, user_name)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT USAGE ON SCHEMA auth TO service_role;
GRANT ALL ON auth.users TO service_role;

-- ============================================
-- Sync existing users with role='teacher' to teachers table
-- ============================================
DO $$
DECLARE
  user_record RECORD;
  synced_count INTEGER := 0;
BEGIN
  -- Loop through all users with role='teacher' who don't have a teacher profile
  FOR user_record IN
    SELECT u.id, u.email, u.full_name
    FROM public.users u
    LEFT JOIN public.teachers t ON u.id = t.user_id
    WHERE u.role = 'teacher' AND t.id IS NULL
  LOOP
    -- Create teacher profile for each user
    INSERT INTO public.teachers (user_id, name, subject, department)
    VALUES (user_record.id, COALESCE(user_record.full_name, split_part(user_record.email, '@', 1)), 'Not assigned', 'Unassigned')
    ON CONFLICT (user_id) DO NOTHING;

    synced_count := synced_count + 1;
  END LOOP;

  RAISE NOTICE 'Synced % teacher profiles', synced_count;
END $$;

-- Also sync student and parent profiles for consistency
DO $$
DECLARE
  user_record RECORD;
  synced_count INTEGER := 0;
BEGIN
  -- Sync students
  FOR user_record IN
    SELECT u.id, u.email, u.full_name
    FROM public.users u
    LEFT JOIN public.students s ON u.id = s.user_id
    WHERE u.role = 'student' AND s.id IS NULL
  LOOP
    INSERT INTO public.students (user_id, name, class, grade_level)
    VALUES (user_record.id, COALESCE(user_record.full_name, split_part(user_record.email, '@', 1)), 'Unassigned', NULL)
    ON CONFLICT (user_id) DO NOTHING;

    synced_count := synced_count + 1;
  END LOOP;

  RAISE NOTICE 'Synced % student profiles', synced_count;
END $$;

DO $$
DECLARE
  user_record RECORD;
  synced_count INTEGER := 0;
BEGIN
  -- Sync parents
  FOR user_record IN
    SELECT u.id, u.email, u.full_name
    FROM public.users u
    LEFT JOIN public.parents p ON u.id = p.user_id
    WHERE u.role = 'parent' AND p.id IS NULL
  LOOP
    INSERT INTO public.parents (user_id, name)
    VALUES (user_record.id, COALESCE(user_record.full_name, split_part(user_record.email, '@', 1)))
    ON CONFLICT (user_id) DO NOTHING;

    synced_count := synced_count + 1;
  END LOOP;

  RAISE NOTICE 'Synced % parent profiles', synced_count;
END $$;
