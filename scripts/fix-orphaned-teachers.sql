-- ========================================
-- FIX ORPHANED TEACHER RECORDS
-- ========================================
-- Run this in Supabase SQL Editor to fix teacher data that isn't showing up

-- STEP 1: Identify the problem
-- This shows teachers that don't have corresponding users records
SELECT
  t.id as teacher_id,
  t.name as teacher_name,
  t.user_id,
  'No matching user record' as issue
FROM teachers t
LEFT JOIN users u ON t.user_id = u.id
WHERE u.id IS NULL;

-- STEP 2: Option A - If the user exists in auth.users but not in public.users
-- This creates the missing public.users records
INSERT INTO public.users (id, email, role, full_name)
SELECT DISTINCT
  t.user_id,
  -- Try to get email from auth.users
  COALESCE(
    (SELECT email FROM auth.users WHERE id = t.user_id LIMIT 1),
    'teacher-' || t.id || '@school.edu'
  ),
  'teacher',
  t.name
FROM teachers t
LEFT JOIN users u ON t.user_id = u.id
WHERE u.id IS NULL
  AND EXISTS (SELECT 1 FROM auth.users WHERE id = t.user_id)
ON CONFLICT (id) DO UPDATE SET
  role = 'teacher',
  full_name = EXCLUDED.name;

-- STEP 3: Option B - If user_id doesn't exist at all, generate a new auth user
-- WARNING: This is a last resort - better to create users properly via signup
-- Uncomment ONLY if you understand the implications:

/*
DO $$
DECLARE
  teacher_record RECORD;
  new_user_id UUID;
BEGIN
  FOR teacher_record IN
    SELECT t.id, t.name, t.user_id
    FROM teachers t
    LEFT JOIN users u ON t.user_id = u.id
    LEFT JOIN auth.users a ON t.user_id = a.id
    WHERE u.id IS NULL AND a.id IS NULL
  LOOP
    -- Generate a new UUID and update teacher record
    new_user_id := gen_random_uuid();

    UPDATE teachers
    SET user_id = new_user_id
    WHERE id = teacher_record.id;

    RAISE NOTICE 'Updated teacher % with new user_id %', teacher_record.name, new_user_id;
  END LOOP;
END $$;
*/

-- STEP 4: Verify the fix
-- After running the above, check that all teachers now have user records
SELECT
  t.id as teacher_id,
  t.name as teacher_name,
  t.user_id,
  u.email,
  u.role,
  CASE WHEN u.id IS NULL THEN 'STILL BROKEN' ELSE 'FIXED' END as status
FROM teachers t
LEFT JOIN users u ON t.user_id = u.id
ORDER BY u.id NULLS LAST;

-- STEP 5: Count summary
SELECT
  COUNT(*) as total_teachers,
  COUNT(u.id) as teachers_with_users,
  COUNT(*) - COUNT(u.id) as orphaned_teachers
FROM teachers t
LEFT JOIN users u ON t.user_id = u.id;
