-- ========================================
-- FIX AUTH SIGNUP TRIGGER FOR ROLE PROFILES
-- ========================================
-- Migration: 20240427000049_fix_auth_signup_trigger
-- Description: Update trigger to create role-specific profiles when user signs up
-- This ensures users created via supabase.auth.signUp() get proper role profiles

-- First, let's update the handle_new_user function to create role-specific profiles
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

-- Ensure the trigger is properly set up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add comment for documentation
COMMENT ON FUNCTION public.handle_new_user() IS 'Handles new user signup by creating entries in public.users and role-specific tables (teachers, students, parents)';
