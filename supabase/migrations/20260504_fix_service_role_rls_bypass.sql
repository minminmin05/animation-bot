-- ============================================
-- Fix: Ensure service_role bypasses RLS for user creation
-- Date: 2026-05-04
-- Description:
--   1. Add explicit policies for service_role to bypass RLS
--   2. Ensure handle_new_user() function can insert into all user tables
--   3. Add service_role as a bypass role for critical tables
-- ============================================

-- 1. ALTER function owner to postgres (bypasses RLS)
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- 2. Add explicit policies for service_role on users table
DROP POLICY IF EXISTS users_service_role_all ON public.users;

CREATE POLICY users_service_role_all ON public.users
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. Add explicit policies for service_role on role-specific tables
DROP POLICY IF EXISTS teachers_service_role_all ON public.teachers;
CREATE POLICY teachers_service_role_all ON public.teachers
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS students_service_role_all ON public.students;
CREATE POLICY students_service_role_all ON public.students
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS parents_service_role_all ON public.parents;
CREATE POLICY parents_service_role_all ON public.parents
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. Grant necessary permissions to service_role
GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.teachers TO service_role;
GRANT ALL ON public.students TO service_role;
GRANT ALL ON public.parents TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.users_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.teachers_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.students_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.parents_id_seq TO service_role;

-- 5. Ensure postgres role (function owner) has all permissions
GRANT ALL ON public.users TO postgres;
GRANT ALL ON public.teachers TO postgres;
GRANT ALL ON public.students TO postgres;
GRANT ALL ON public.parents TO postgres;

-- 6. Grant execute on function to service_role and postgres
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres;

-- 7. Ensure trigger function can bypass RLS
-- The function is already SECURITY DEFINER, but let's verify
ALTER FUNCTION public.handle_new_user() SECURITY DEFINER SET search_path = public, auth;

-- 8. Log the changes for debugging
DO $$
BEGIN
  RAISE NOTICE 'RLS policies updated for service_role bypass';
  RAISE NOTICE 'Function handle_new_user() owner: %', (SELECT pg_get_userbyid(proowner) FROM pg_proc WHERE proname = 'handle_new_user');
END $$;

INSERT INTO public.teachers (user_id, name, subject)
SELECT 
  u.id,
  COALESCE(u.full_name, u.email),
  'no data'
FROM public.users u
LEFT JOIN public.teachers t ON t.user_id = u.id
WHERE u.role = 'teacher'
AND t.user_id IS NULL;