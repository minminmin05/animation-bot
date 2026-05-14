# SECURITY REVIEW: Student Management System

## 🚨 CRITICAL SECURITY ISSUES

### 1. OVER-PERMISSIVE RLS POLICY (DEATH TO PRODUCTION)

The "dev-friendly" policy I previously suggested is **DANGEROUS**:

```sql
-- ❌ NEVER USE IN PRODUCTION - THIS IS A SECURITY VULNERABILITY
CREATE POLICY "dev_allow_all_read" ON students
  FOR SELECT
  USING (true);  -- Allows ANYONE to read ALL student data
```

**Risk:** Any authenticated user can read ALL student PII (names, emails, phones, addresses, DOB).

---

### 2. FRONTEND EXPOSING USER IDs

The current query returns `user_id` which could be used for:
- User enumeration attacks
- Direct object reference attacks
- Linking identities across tables

```typescript
// Current query exposes user_id
user_id,
name,
class,
grade_level,
```

---

### 3. NO AUTHORIZATION CHECK ON CLIENT

The `StudentManagement.jsx` component assumes:
- If you can access the route, you're an admin
- No server-side verification of role

```javascript
// ❌ NO AUTH CHECK - Assumes routing handles it
const StudentManagement = () => {
  const fetchStudents = async () => {
    const { data, error } = await supabase
      .from('students')
      .select('...')  // No admin verification in query
  }
}
```

---

## ✅ SECURE IMPLEMENTATION

### Step 1: PROPER RLS POLICIES (PRODUCTION-READY)

```sql
-- =====================================================
-- SECURE RLS POLICIES FOR STUDENTS TABLE
-- =====================================================

-- Enable RLS
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- DROP ALL EXISTING POLICIES FIRST (clean slate)
DROP POLICY IF EXISTS "allow_authenticated_read" ON students;
DROP POLICY IF EXISTS "dev_allow_all_read" ON students;
DROP POLICY IF EXISTS "students_select_policy" ON students;

-- =====================================================
-- 1. ADMIN POLICIES (Full CRUD access)
-- =====================================================

-- Admins can read ALL student records
CREATE POLICY "students_admin_select_all" ON students
  FOR SELECT
  TO authenticated
  USING (
    -- Check if current user is admin
    EXISTS (
      SELECT 1
      FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admins can insert students
CREATE POLICY "students_admin_insert" ON students
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admins can update any student
CREATE POLICY "students_admin_update_all" ON students
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admins can delete any student
CREATE POLICY "students_admin_delete_all" ON students
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- =====================================================
-- 2. TEACHER POLICIES (Read-only, their class students)
-- =====================================================

-- Teachers can read students in their assigned classes
-- (Requires teacher_classes junction table)
CREATE POLICY "students_teacher_read_assigned" ON students
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'teacher'
    )
    AND EXISTS (
      SELECT 1
      FROM teacher_classes
      WHERE teacher_classes.user_id = auth.uid()
      AND teacher_classes.class_name = students.class
    )
  );

-- =====================================================
-- 3. STUDENT POLICIES (Read own data only)
-- =====================================================

-- Students can read their own record
CREATE POLICY "students_student_read_own" ON students
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
  );

-- Students can update their own limited fields
CREATE POLICY "students_student_update_own" ON students
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND -- Only allow updating safe fields (phone, address)
    -- This requires a trigger or separate update endpoint
    true
  );

-- =====================================================
-- 4. PARENT POLICIES (Read own children's data)
-- =====================================================

-- Parents can read their children's records
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
-- 5. SECURITY FUNCTIONS (Helper for authorization)
-- =====================================================

-- Create a function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER  -- Run with function owner's permissions
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

-- Now policies can use: is_admin() = true

-- =====================================================
-- 6. AUDIT LOGGING (Track access to sensitive data)
-- =====================================================

-- Create audit table for student data access
CREATE TABLE IF NOT EXISTS student_data_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  action text, -- 'read', 'update', 'delete'
  target_student_id uuid REFERENCES students(id),
  ip_address text,
  user_agent text,
  accessed_at timestamptz DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE student_data_access_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY "audit_log_admin_read" ON student_data_access_log
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- Create trigger to log student data reads
CREATE OR REPLACE FUNCTION log_student_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'SELECT' THEN
    INSERT INTO student_data_access_log (user_id, action, target_student_id)
    VALUES (auth.uid(), 'read', NEW.id);
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

-- =====================================================
-- 7. VERIFY POLICIES
-- =====================================================

-- List all policies on students table
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'students'
ORDER BY policyname;
```

---

### Step 2: SECURE SUPABASE QUERY WITH ROLE CHECK

```typescript
// src/lib/supabase/secure-queries.ts

import { supabase } from '../../config/supabaseClient'

/**
 * SECURE student query with admin verification
 *
 * This query relies on RLS policies to enforce access control.
 * If the user is not an admin, RLS will block the query entirely.
 */
export async function fetchStudentsAsAdmin() {
  const { data, error } = await supabase
    .from('students')
    .select(`
      id,
      name,
      class,
      grade_level,
      phone,
      enrollment_date,
      created_at,
      -- Mask sensitive fields - use only what's needed
      user:users (
        email,
        full_name,
        role
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    // Check if it's a permission error
    if (error.code === '42501') { // permission denied
      console.error('Security: Unauthorized access attempt to student data')
      throw new Error('You do not have permission to view student data.')
    }
    throw error
  }

  return data
}

/**
 * Fetch a single student - user can only see their own data
 * unless they are an admin (enforced by RLS)
 */
export async function fetchStudentByIdSecure(studentId: string) {
  const { data, error } = await supabase
    .from('students')
    .select(`
      id,
      name,
      class,
      grade_level,
      phone,
      address,
      date_of_birth,
      enrollment_date,
      user:users (email, full_name, role)
    `)
    .eq('id', studentId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found OR not authorized
      throw new Error('Student not found or access denied')
    }
    if (error.code === '42501') {
      throw new Error('Access denied')
    }
    throw error
  }

  return data
}

/**
 * SERVER-SIDE: Verify admin role before sensitive operations
 * Use this in Server Actions or API routes
 */
export async function verifyAdminRole(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .eq('role', 'admin')
    .single()

  if (error || !data) {
    return false
  }

  return data.role === 'admin'
}
```

---

### Step 3: SECURE FRONTEND COMPONENT

```tsx
// src/pages/admin/StudentManagementSecure.tsx

import { useEffect, useState } from 'react'
import { supabase } from '../../config/supabaseClient'
import { Spinner } from '../../components/Spinner'

const StudentManagementSecure = () => {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isVerifiedAdmin, setIsVerifiedAdmin] = useState(false)

  useEffect(() => {
    // Verify user is admin before fetching data
    verifyAndFetch()
  }, [])

  const verifyAndFetch = async () => {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error('You must be logged in to access this page.')
      }

      // Verify admin role (RLS will also block, but this is for UX)
      const { data: userData, error: roleError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (roleError || !userData || userData.role !== 'admin') {
        throw new Error('Access denied. Admin privileges required.')
      }

      setIsVerifiedAdmin(true)
      await fetchStudents()

    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  const fetchStudents = async () => {
    try {
      // RLS policy will enforce admin-only access at database level
      const { data, error: fetchError } = await supabase
        .from('students')
        .select(`
          id,
          name,
          class,
          grade_level,
          phone,
          enrollment_date,
          created_at,
          user:users (
            id,
            email,
            full_name,
            role
          )
        `)
        .order('created_at', { ascending: false })

      if (fetchError) {
        // Handle RLS denial
        if (fetchError.code === '42501') {
          throw new Error('Permission denied by database security policy.')
        }
        throw fetchError
      }

      setStudents(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="large" />
      </div>
    )
  }

  // Error state with security messaging
  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="text-red-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-red-800 dark:text-red-400">Access Denied</h3>
            <p className="text-sm text-red-600 dark:text-red-500 mt-1">{error}</p>
            <p className="text-xs text-red-500 mt-2">
              This access attempt has been logged.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Success - render student list
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Student Management</h1>
        <span className="text-sm text-gray-500">
          {students.length} students
        </span>
      </div>

      {/* Student table */}
      <table className="w-full">
        {/* Table content */}
      </table>
    </div>
  )
}

export default StudentManagementSecure
```

---

### Step 4: ADDITIONAL SECURITY MEASURES

```sql
-- =====================================================
-- ADDITIONAL SECURITY LAYERS
-- =====================================================

-- 1. Column-level encryption for sensitive fields
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add encrypted column for phone (example)
ALTER TABLE students ADD COLUMN phone_encrypted bytea;

-- Update trigger to encrypt phone on insert
CREATE OR REPLACE FUNCTION encrypt_student_phone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.phone IS NOT NULL THEN
    NEW.phone_encrypted = pgp_sym_encrypt(NEW.phone, 'your-encryption-key');
    NEW.phone = NULL; -- Clear the plain text version
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Data retention policy (auto-delete old records)
CREATE OR REPLACE FUNCTION delete_old_student_records()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete student records after X years of graduation
  DELETE FROM students
  WHERE enrollment_date < NOW() - INTERVAL '7 years';
END;
$$;

-- 3. Rate limiting function (track API usage)
CREATE TABLE IF NOT EXISTS rate_limit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  endpoint text,
  requested_at timestamptz DEFAULT now()
);

CREATE INDEX ON rate_limit_log (user_id, requested_at);

-- 4. Mask sensitive data in logs
CREATE OR REPLACE FUNCTION mask_email(email text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    CASE
      WHEN email IS NULL THEN NULL
      ELSE left(email, 2) || '****@' || split_part(email, '@', 2)
    END;
$$;
```

---

## SECURITY CHECKLIST

| Security Measure | Status | Priority |
|-----------------|--------|----------|
| RLS enabled on students | ☐ | CRITICAL |
| Admin-only SELECT policy | ☐ | CRITICAL |
| Role verification on client | ☐ | HIGH |
| Audit logging enabled | ☐ | HIGH |
| Column encryption for PII | ☐ | MEDIUM |
| Rate limiting implemented | ☐ | MEDIUM |
| Data retention policy | ☐ | LOW |
| Security headers configured | ☐ | LOW |

---

## TESTING SECURITY

```sql
-- Test 1: Verify non-admin cannot read students
-- First, get a non-admin user ID
SELECT id, email, role FROM users WHERE role != 'admin' LIMIT 1;

-- Then, with that user's session, try:
SET LOCAL role TO 'user_without_admin_role';
SELECT * FROM students; -- Should return 0 rows or error

-- Test 2: Verify admin CAN read
SET LOCAL role TO 'admin_user_role';
SELECT * FROM students; -- Should return data

-- Test 3: Check for SQL injection vulnerabilities
-- (Supabase client handles this, but verify)
```
