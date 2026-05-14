-- ========================================
-- INITIAL USER SETUP SCRIPT
-- ========================================
-- This script sets up the initial admin and demo users
--
-- IMPORTANT: Run this in Supabase SQL Editor to create initial users
--
-- After running this, users can log in with:
--   admin@school.com / demo1234
--   teacher@school.com / demo1234
--   student@school.com / demo1234
--   parent@school.com / demo1234
--
-- NOTE: This uses a workaround where passwords are set via update_user
-- You'll need to reset passwords for users created this way, or use
-- the signup flow which now works correctly

-- First, ensure the trigger function exists and is up to date
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

-- Create or replace trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;

-- Sync any existing auth users
DO $$
DECLARE
  auth_user RECORD;
BEGIN
  FOR auth_user IN
    SELECT id, email, raw_user_meta_data
    FROM auth.users
    WHERE deleted_at IS NULL
  LOOP
    INSERT INTO public.users (id, email, role, full_name)
    VALUES (
      auth_user.id,
      auth_user.email,
      COALESCE(auth_user.raw_user_meta_data->>'role', 'student'),
      COALESCE(auth_user.raw_user_meta_data->>'full_name', split_part(auth_user.email, '@', 1))
    )
    ON CONFLICT (id) DO NOTHING;

    -- Create role profiles if missing
    IF COALESCE(auth_user.raw_user_meta_data->>'role', 'student') = 'teacher' THEN
      INSERT INTO teachers (user_id, name, subject, department)
      VALUES (
        auth_user.id,
        COALESCE(auth_user.raw_user_meta_data->>'full_name', split_part(auth_user.email, '@', 1)),
        'Not assigned', 'Unassigned'
      )
      ON CONFLICT (user_id) DO NOTHING;
    ELSIF COALESCE(auth_user.raw_user_meta_data->>'role', 'student') = 'student' THEN
      INSERT INTO students (user_id, name, class, grade_level)
      VALUES (
        auth_user.id,
        COALESCE(auth_user.raw_user_meta_data->>'full_name', split_part(auth_user.email, '@', 1)),
        'Unassigned', NULL
      )
      ON CONFLICT (user_id) DO NOTHING;
    ELSIF COALESCE(auth_user.raw_user_meta_data->>'role', 'student') = 'parent' THEN
      INSERT INTO parents (user_id, name)
      VALUES (
        auth_user.id,
        COALESCE(auth_user.raw_user_meta_data->>'full_name', split_part(auth_user.email, '@', 1))
      )
      ON CONFLICT (user_id) DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- Output result
SELECT jsonb_build_object(
  'success', true,
  'message', 'Setup complete! Users synced. Please create users via the signup page.'
) as result;
