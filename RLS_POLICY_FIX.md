# RLS POLICY FIX - Students Table Access

## ROOT CAUSE

**Why queries work in Supabase SQL Editor but fail in the browser:**

| Connection | Permissions | RLS Bypass |
|------------|-------------|------------|
| Supabase SQL Editor | Database owner (postgres) | ✅ YES - Ignores RLS |
| Frontend (anon key) | Unauthenticated user | ❌ NO - Subject to RLS |
| Frontend (auth key) | Authenticated user | ❌ NO - Subject to RLS |

The error `"RLS Policy Issue: no policy allows reading"` means:
- RLS is **enabled** on the `students` table
- **No SELECT policy** exists for `authenticated` or `anon` roles
- The database rejects the query with code `42501` (permission denied)

---

## STEP-BY-STEP FIX

### STEP 1: Check Current RLS Status

```sql
-- Check if RLS is enabled on students table
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'students';

-- Expected: rowsecurity = true
-- If rowsecurity = false, RLS is NOT the issue
```

### STEP 2: Check Existing Policies

```sql
-- View all existing policies on students table
SELECT
  policyname,
  cmd,           -- SELECT, INSERT, UPDATE, DELETE, ALL
  roles,         -- Who this policy applies to
  qual,          -- USING clause (for existing rows)
  with_check     -- WITH CHECK clause (for new/updated rows)
FROM pg_policies
WHERE tablename = 'students';

-- If empty: No policies exist (this is your problem!)
-- If has policies: Check if any allow SELECT for authenticated/anon
```

### STEP 3: Enable RLS (if not enabled)

```sql
-- Enable RLS on students table
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Verify
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'students';
```

---

## OPTION A: DEVELOPMENT MODE (TEMPORARY)

⚠️ **WARNING: This is NOT secure for production!**

Use this ONLY to quickly verify RLS is the issue. This allows ANY authenticated user to read ALL data.

```sql
-- =====================================================
-- DEVELOPMENT MODE - OPEN ACCESS
-- =====================================================
-- ⚠️  DANGER: These policies are for development only!
-- ⚠️  DO NOT deploy to production!

-- Drop any existing policies (clean slate)
DROP POLICY IF EXISTS "dev_allow_all_select" ON students;
DROP POLICY IF EXISTS "dev_allow_all_insert" ON students;
DROP POLICY IF EXISTS "dev_allow_all_update" ON students;
DROP POLICY IF EXISTS "dev_allow_all_delete" ON students;

-- Create permissive SELECT policy (READ ACCESS for everyone)
CREATE POLICY "dev_allow_all_select" ON students
  FOR SELECT
  TO authenticated, anon
  USING (true);  -- true = allow all rows

-- Create permissive INSERT policy (optional - only if needed)
CREATE POLICY "dev_allow_all_insert" ON students
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create permissive UPDATE policy (optional)
CREATE POLICY "dev_allow_all_update" ON students
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create permissive DELETE policy (optional - be careful!)
CREATE POLICY "dev_allow_all_delete" ON students
  FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- VERIFICATION - Run to confirm policies are active
-- =====================================================
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'students';

-- Expected output should show the new policies
```

**After applying dev policies, test in browser:**
1. Refresh the Student Management page
2. Should see student data immediately
3. Check browser console for errors

**To remove dev policies before production:**
```sql
DROP POLICY IF EXISTS "dev_allow_all_select" ON students;
DROP POLICY IF EXISTS "dev_allow_all_insert" ON students;
DROP POLICY IF EXISTS "dev_allow_all_update" ON students;
DROP POLICY IF EXISTS "dev_allow_all_delete" ON students;
```

---

## OPTION B: PRODUCTION MODE (SECURE)

✅ **Use this for production deployment**

These policies enforce role-based access control (RBAC).

### Prerequisites

Your `users` table should have a `role` column with values: `admin`, `teacher`, `student`, `parent`

```sql
-- Check if your users table has a role column
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name = 'role';

-- If no role column exists, add it:
ALTER TABLE users ADD COLUMN role text DEFAULT 'student';
CREATE INDEX ON users(role);

-- Update existing users to have roles
UPDATE users SET role = 'admin' WHERE email = 'your-admin@email.com';
```

### Production RLS Policies

```sql
-- =====================================================
-- PRODUCTION MODE - SECURE ROLE-BASED POLICIES
-- =====================================================

-- STEP 1: Clean up any existing policies
DROP POLICY IF EXISTS "dev_allow_all_select" ON students;
DROP POLICY IF EXISTS "dev_allow_all_insert" ON students;
DROP POLICY IF EXISTS "dev_allow_all_update" ON students;
DROP POLICY IF EXISTS "dev_allow_all_delete" ON students;
DROP POLICY IF EXISTS "students_select_policy" ON students;
DROP POLICY IF EXISTS "students_all_policy" ON students;
DROP POLICY IF EXISTS "allow_authenticated_read" ON students;

-- STEP 2: Create helper function for admin check
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
STABLE  -- Can be used in WHERE clauses
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM users
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

-- STEP 3: Create admin policies (full access)
CREATE POLICY "students_admin_select_all" ON students
  FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "students_admin_insert" ON students
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "students_admin_update_all" ON students
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "students_admin_delete_all" ON students
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- STEP 4: Create teacher policies (read students in their classes)
CREATE POLICY "students_teacher_read_assigned" ON students
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'teacher'
      -- Note: Add teacher_classes junction table check here
      -- AND EXISTS (SELECT 1 FROM teacher_classes WHERE ...)
    )
  );

-- STEP 5: Create student policies (read own data only)
CREATE POLICY "students_student_read_own" ON students
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- STEP 6: Create parent policies (read children's data)
-- This assumes you have a parents table linking parents to students
CREATE POLICY "students_parent_read_children" ON students
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM parents
      WHERE parents.user_id = auth.uid()
      AND parents.student_id = students.id
    )
  );

-- =====================================================
-- VERIFICATION
-- =====================================================

-- View all policies
SELECT
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'students'
ORDER BY policyname;

-- Expected output:
-- policyname                       | cmd     | roles
-- ---------------------------------|---------|--------------
-- students_admin_delete_all        | DELETE  | authenticated
-- students_admin_insert            | INSERT  | authenticated
-- students_admin_select_all        | SELECT  | authenticated
-- students_admin_update_all        | UPDATE  | authenticated
-- students_parent_read_children    | SELECT  | authenticated
-- students_student_read_own        | SELECT  | authenticated
-- students_teacher_read_assigned   | SELECT  | authenticated
```

---

## TESTING YOUR POLICIES

### Test 1: Verify Admin Access

```sql
-- Replace with your actual admin user ID from the users table
-- Find admin ID: SELECT id, email, role FROM users WHERE role = 'admin';

SET LOCAL role TO 'authenticated';  -- Simulate authenticated user
SET request.user.id = 'your-admin-user-id-here';

SELECT COUNT(*) FROM students;  -- Should return number of students
```

### Test 2: Verify Student Can Only See Own Data

```sql
-- Set a student user ID
SET LOCAL role TO 'authenticated';
SET request.user.id = 'your-student-user-id-here';

SELECT * FROM students;  -- Should return ONLY that student's record
```

### Test 3: Verify Browser Access

1. After applying policies, refresh your frontend
2. Open Browser DevTools Console
3. Look for successful query:
   ```
   ✅ Students fetched: X
   ```
4. If still failing, check the error:
   - `"permission denied"` → Policy still not allowing access
   - `"column does not exist"` → Query referencing wrong column
   - `"relation does not exist"` → Table name wrong

---

## QUICK DIAGNOSIS SQL

```sql
-- Run this to diagnose the exact issue
DO $$
DECLARE
  rls_enabled boolean;
  policy_count int;
  has_select_policy boolean;
BEGIN
  -- Check RLS status
  SELECT rowsecurity INTO rls_enabled
  FROM pg_tables
  WHERE tablename = 'students';

  RAISE NOTICE 'RLS Enabled: %', rls_enabled;

  -- Count policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'students';

  RAISE NOTICE 'Total Policies: %', policy_count;

  -- Check for SELECT policies
  SELECT COUNT(*) > 0 INTO has_select_policy
  FROM pg_policies
  WHERE tablename = 'students'
  AND cmd IN ('SELECT', 'ALL');

  RAISE NOTICE 'Has SELECT Policy: %', has_select_policy;

  IF rls_enabled AND NOT has_select_policy THEN
    RAISE NOTICE '❌ ISSUE CONFIRMED: RLS is enabled but no SELECT policy exists!';
    RAISE NOTICE '✅ SOLUTION: Run the Dev or Production SQL from this document.';
  END IF;
END $$;
```

---

## SUMMARY

| Step | Action | Command |
|------|--------|---------|
| 1 | Check RLS status | `SELECT rowsecurity FROM pg_tables WHERE tablename = 'students'` |
| 2 | Check policies | `SELECT * FROM pg_policies WHERE tablename = 'students'` |
| 3a | Apply dev fix | Run "OPTION A" SQL (temporary) |
| 3b | Apply prod fix | Run "OPTION B" SQL (secure) |
| 4 | Verify | Refresh browser, check console |
| 5 | Test | Run verification queries in SQL Editor |
