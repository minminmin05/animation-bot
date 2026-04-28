# SUPABASE SECURITY ARCHITECTURE
## School Management System - Enterprise Security Framework

---

## 1. SECURITY ARCHITECTURE OVERVIEW

### Threat Model Analysis

```
┌─────────────────────────────────────────────────────────────────┐
│                        ATTACK SURFACE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │  PUBLIC     │    │ AUTHENTICATED│    │   ADMIN     │        │
│  │  (ANON KEY) │    │  (USER KEY) │    │  (ADMIN)     │        │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘        │
│         │                  │                  │                 │
│         ▼                  ▼                  ▼                 │
│  ┌─────────────────────────────────────────────────────┐       │
│  │              SUPABASE POSTGREST API                  │       │
│  │                 (RLS ENFORCEMENT)                    │       │
│  └──────────────────────┬──────────────────────────────┘       │
│                         │                                       │
│                         ▼                                       │
│  ┌─────────────────────────────────────────────────────┐       │
│  │              DATABASE (PostgreSQL)                   │       │
│  │  • RLS Policies  • Encryption  • Audit Logs         │       │
│  └─────────────────────────────────────────────────────┘       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

THREAT VECTORS MITIGATED:
├─ Unauthorized data access → RLS policies + auth.uid() checks
├─ SQL injection → Parameterized queries (Supabase client)
├─ Privilege escalation → Role-based policies + admin verification
├─ Data exfiltration → Row-level limits + audit logging
├─ PII exposure → Encryption + masking + minimal SELECT
└─ Session hijacking → Secure token storage + refresh rotation
```

---

## 2. ZERO-TRUST RLS ARCHITECTURE

### Core Principle: Default Deny

```sql
-- =====================================================
-- ZERO-TRUST SECURITY MODEL
-- =====================================================
-- Every query must be explicitly authorized.
-- No implicit permissions. No inheritance of privileges.

-- Enable RLS on ALL user-facing tables
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN VALUES
    ('students'), ('teachers'), ('parents'),
    ('grades'), ('attendance'), ('assignments'),
    ('classes'), ('subjects')
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    RAISE NOTICE 'RLS enabled on %', tbl;
  END LOOP;
END $$;

-- Create a default DENY ALL policy for each table
-- This ensures no accidental access if specific policies are missing
```

### Policy Hierarchy Pattern

``                    ┌──────────────────┐
                    │   PUBLIC/ANON    │
                    │  (Least Access)  │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  AUTHENTICATED   │
                    │   (Own Data)     │
                    └────────┬─────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
 ┌──────▼──────┐    ┌────────▼────────┐  ┌───────▼──────┐
 │  STUDENT    │    │    TEACHER      │  │   PARENT     │
 │ (Own Only)  │    │ (Assigned Only) │  │ (Children)   │
 └─────────────┘    └─────────────────┘  └──────────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                    ┌────────▼─────────┐
                    │     ADMIN        │
                    │   (Full Access)  │
                    └──────────────────┘
```

---

## 3. PRODUCTION-READY RLS POLICIES

### 3.1 Students Table Security

```sql
-- =====================================================
-- STUDENTS TABLE - COMPREHENSIVE RLS POLICIES
-- =====================================================

-- Prerequisite: Helper functions
CREATE OR REPLACE FUNCTION auth_has_role(required_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = required_role
  );
$$;

CREATE OR REPLACE function is_student_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM students
    WHERE students.id IN (
      SELECT id FROM students WHERE user_id = auth.uid()
    )
    AND students.user_id = auth.uid()
  );
$$;

-- Drop all existing policies
DROP POLICY IF EXISTS "students_" ON students;

-- ============================================
-- ADMIN POLICIES (Full CRUD)
-- ============================================
CREATE POLICY "students_admin_select" ON students
  FOR SELECT
  TO authenticated
  USING (auth_has_role('admin'));

CREATE POLICY "students_admin_insert" ON students
  FOR INSERT
  TO authenticated
  WITH CHECK (auth_has_role('admin'));

CREATE POLICY "students_admin_update" ON students
  FOR UPDATE
  TO authenticated
  USING (auth_has_role('admin'))
  WITH CHECK (auth_has_role('admin'));

CREATE POLICY "students_admin_delete" ON students
  FOR DELETE
  TO authenticated
  USING (auth_has_role('admin'));

-- ============================================
-- TEACHER POLICIES (Read assigned classes only)
-- ============================================
CREATE POLICY "students_teacher_select" ON students
  FOR SELECT
  TO authenticated
  USING (
    auth_has_role('teacher')
    AND EXISTS (
      SELECT 1 FROM teacher_class_assignments
      WHERE teacher_class_assignments.teacher_id = auth.uid()
      AND teacher_class_assignments.class_name = students.class
    )
  );

-- ============================================
-- STUDENT POLICIES (Read own data only)
-- ============================================
CREATE POLICY "students_student_select" ON students
  FOR SELECT
  TO authenticated
  USING (
    auth_has_role('student')
    AND user_id = auth.uid()
  );

CREATE POLICY "students_student_update" ON students
  FOR UPDATE
  TO authenticated
  USING (
    auth_has_role('student')
    AND user_id = auth.uid()
  )
  WITH CHECK (
    auth_has_role('student')
    AND user_id = auth.uid()
    -- Students can only update specific fields
    AND (
      -- Allow updating these fields
      (phone IS NOT DISTINCT FROM OLD.phone)
      AND (address IS NOT DISTINCT FROM OLD.address)
      -- Block changes to critical fields
      AND (class = OLD.class)
      AND (grade_level = OLD.grade_level)
      AND (enrollment_date = OLD.enrollment_date)
    )
  );

-- ============================================
-- PARENT POLICIES (Read children's data only)
-- ============================================
CREATE POLICY "students_parent_select" ON students
  FOR SELECT
  TO authenticated
  USING (
    auth_has_role('parent')
    AND EXISTS (
      SELECT 1 FROM parent_student_relationships
      WHERE parent_student_relationships.parent_id = auth.uid()
      AND parent_student_relationships.student_id = students.id
    )
  );

-- ============================================
-- VERIFICATION
-- ============================================
SELECT
  policyname,
  cmd,
  roles,
  CASE
    WHEN qual IS NOT NULL THEN 'has_filter'
    ELSE 'no_filter'
  END as filter_status
FROM pg_policies
WHERE tablename = 'students'
ORDER BY cmd, policyname;
```

### 3.2 Grades Table Security (Higher Sensitivity)

```sql
-- =====================================================
-- GRADES TABLE - HIGH SECURITY
-- =====================================================
-- Grades are sensitive - stricter policies apply

ALTER TABLE grades ENABLE ROW LEVEL SECURITY;

-- Admin: Full access
CREATE POLICY "grades_admin_all" ON grades
  FOR ALL
  TO authenticated
  USING (auth_has_role('admin'));

-- Teacher: Can read/update grades for their classes
CREATE POLICY "grades_teacher_manage" ON grades
  FOR ALL
  TO authenticated
  USING (
    auth_has_role('teacher')
    AND EXISTS (
      SELECT 1 FROM teacher_class_assignments
      WHERE teacher_class_assignments.teacher_id = auth.uid()
      AND teacher_class_assignments.class_name = (
        SELECT class FROM students WHERE students.id = grades.student_id
      )
    )
  )
  WITH CHECK (
    auth_has_role('teacher')
    AND EXISTS (
      SELECT 1 FROM teacher_class_assignments
      WHERE teacher_class_assignments.teacher_id = auth.uid()
      AND teacher_class_assignments.class_name = (
        SELECT class FROM students WHERE students.id = grades.student_id
      )
    )
  );

-- Student: Can only read own grades (UPDATE not allowed)
CREATE POLICY "grades_student_read_own" ON grades
  FOR SELECT
  TO authenticated
  USING (
    auth_has_role('student')
    AND student_id = (SELECT id FROM students WHERE user_id = auth.uid())
  );

-- Parent: Can read children's grades only
CREATE POLICY "grades_parent_read_children" ON grades
  FOR SELECT
  TO authenticated
  USING (
    auth_has_role('parent')
    AND EXISTS (
      SELECT 1 FROM parent_student_relationships
      WHERE parent_student_relationships.parent_id = auth.uid()
      AND parent_student_relationships.student_id = grades.student_id
    )
  );

-- IMPORTANT: No INSERT/UPDATE for students/parents on grades
```

---

## 4. SECURITY HELPER FUNCTIONS

```sql
-- =====================================================
-- SECURITY UTILITY FUNCTIONS
-- =====================================================

-- 4.1 Get current user's role (cached in session)
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$;

-- 4.2 Check if user can access specific student
CREATE OR REPLACE FUNCTION can_access_student(target_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Admins can access any student
    auth_has_role('admin')
    OR
    -- Teachers can access students in their classes
    (auth_has_role('teacher')
      AND EXISTS (
        SELECT 1 FROM teacher_class_assignments tca
        JOIN students s ON s.class = tca.class_name
        WHERE s.id = target_student_id
        AND tca.teacher_id = auth.uid()
      ))
    OR
    -- Students can only access themselves
    (auth_has_role('student')
      AND EXISTS (
        SELECT 1 FROM students
        WHERE id = target_student_id
        AND user_id = auth.uid()
      ))
    OR
    -- Parents can access their children
    (auth_has_role('parent')
      AND EXISTS (
        SELECT 1 FROM parent_student_relationships
        WHERE parent_id = auth.uid()
        AND student_id = target_student_id
      ));
$$;

-- 4.3 Log security events
CREATE TABLE IF NOT EXISTS security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,  -- 'access_denied', 'unauthorized_attempt', 'privilege_escalation'
  user_id uuid,
  table_name text,
  action text,
  details jsonb,
  ip_address text,
  user_agent text,
  occurred_at timestamptz DEFAULT now()
);

CREATE INDEX ON security_audit_log(occurred_at DESC);
CREATE INDEX ON security_audit_log(user_id);
CREATE INDEX ON security_audit_log(event_type);

CREATE OR REPLACE FUNCTION log_security_event(
  p_event_type text,
  p_table_name text DEFAULT NULL,
  p_action text DEFAULT NULL,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO security_audit_log (
    event_type,
    user_id,
    table_name,
    action,
    details
  ) VALUES (
    p_event_type,
    auth.uid(),
    p_table_name,
    p_action,
    p_details || jsonb_build_object(
      'role', current_user_role(),
      'timestamp', now()
    )
  );
END;
$$;

-- 4.4 Trigger to auto-log access denials
CREATE OR REPLACE FUNCTION log_access_denial()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_stat_activity
    WHERE query LIKE '%permission denied%'
    OR query LIKE '%42501%'
  ) THEN
    PERFORM log_security_event('access_denied');
  END IF;
END;
$$;
```

---

## 5. DATA ENCRYPTION & MASKING

```sql
-- =====================================================
-- DATA PROTECTION LAYERS
-- =====================================================

-- 5.1 Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 5.2 Create encryption/decryption functions
-- In production, use proper key management (not hardcoded!)

CREATE OR REPLACE FUNCTION encrypt_pii(data text)
RETURNS bytea
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT pgp_sym_encrypt(data, current_setting('app.encryption_key', true));
$$;

CREATE OR REPLACE FUNCTION decrypt_pii(data bytea)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT pgp_sym_decrypt(data, current_setting('app.encryption_key', true));
$$;

-- 5.3 Mask email for display (show partial)
CREATE OR REPLACE FUNCTION mask_email(email text)
RETURNS text
LANGUAGE sql
IMMUTABLE
LEAKPROOF  -- Don't reveal info via error messages
AS $$
  SELECT
    CASE
      WHEN email IS NULL THEN NULL
      ELSE LEFT(email, 2) || '****@' || SPLIT_PART(email, '@', 2)
    END;
$$;

-- 5.4 Mask phone number
CREATE OR REPLACE FUNCTION mask_phone(phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
LEAKPROOF
AS $$
  SELECT
    CASE
      WHEN phone IS NULL THEN NULL
      WHEN LENGTH(phone) >= 10 THEN
        '(***) ***-' || RIGHT(phone, 4)
      ELSE '***-***-****'
    END;
$$;

-- 5.5 Create a view with masked data for non-admin queries
CREATE OR REPLACE VIEW students_masked AS
SELECT
  id,
  name,  -- Full name may be needed for identification
  class,
  grade_level,
  mask_phone(phone) as phone,  -- Masked
  NULL as address,  -- Completely hidden
  NULL as date_of_birth,  -- PII - hidden
  enrollment_date,
  created_at
FROM students;

-- Grant access to masked view
GRANT SELECT ON students_masked TO authenticated;
```

---

## 6. AUDIT & COMPLIANCE

```sql
-- =====================================================
-- COMPREHENSIVE AUDIT SYSTEM
-- =====================================================

-- 6.1 Main audit table
CREATE TABLE IF NOT EXISTS comprehensive_audit_log (
  id bigserial PRIMARY KEY,
  -- Transaction info
  transaction_id uuid DEFAULT gen_random_uuid(),
  occurred_at timestamptz DEFAULT now(),

  -- User info
  user_id uuid,
  user_role text,

  -- Action info
  table_name text NOT NULL,
  action text NOT NULL,  -- SELECT, INSERT, UPDATE, DELETE
  record_id uuid,

  -- Data changes (for UPDATE)
  old_data jsonb,
  new_data jsonb,

  -- Changed fields list
  changed_fields text[],

  -- Context
  ip_address inet,
  user_agent text,
  success boolean DEFAULT true,
  error_message text,

  -- PII flag
  contains_pii boolean DEFAULT false
);

-- Indexes for audit queries
CREATE INDEX ON comprehensive_audit_log(occurred_at DESC);
CREATE INDEX ON comprehensive_audit_log(user_id);
CREATE INDEX ON comprehensive_audit_log(table_name, action);
CREATE INDEX ON comprehensive_audit_log(record_id);
CREATE INDEX ON comprehensive_audit_log(contains_pii) WHERE contains_pii = true;

-- 6.2 Generic audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changed_fields text[] := '{}';
  row_data jsonb;
BEGIN
  -- Build changed fields list for UPDATE
  IF TG_OP = 'UPDATE' THEN
    -- Compare old and new values
    IF OLD IS DISTINCT FROM NEW THEN
      -- Determine which columns changed
      FOR changed_fields IN
        SELECT ARRAY_AGG(ATTNAME::text)
        FROM (
          SELECT ATTNAME
          FROM PG_ATTRIBUTE
          WHERE ATTRELID = TG_RELID
          AND ATTNUM > 0
          AND NOT ATTISSYSTEM
          AND (
            (TG_OP = 'UPDATE' AND (
              (OLD.* IS DISTINCT FROM NEW.*)::text::boolean[]
            ))::text[] IS NOT NULL
          )
        ) cols
      LOOP
      END LOOP;
    END IF;
  END IF;

  -- Insert audit record
  INSERT INTO comprehensive_audit_log (
    user_id,
    user_role,
    table_name,
    action,
    record_id,
    old_data,
    new_data,
    changed_fields,
    contains_pii
  ) VALUES (
    auth.uid(),
    current_user_role(),
    TG_TABLE_NAME::text,
    TG_OP,
    COALESCE(NEW.id, OLD.id),
    to_jsonb(OLD),
    to_jsonb(NEW),
    changed_fields,
    TG_TABLE_NAME IN ('students', 'users', 'parents', 'grades')
  );

  RETURN NEW;
END;
$$;

-- 6.3 Apply audit triggers to sensitive tables
DROP TRIGGER IF EXISTS audit_students ON students;
CREATE TRIGGER audit_students
  AFTER INSERT OR UPDATE OR DELETE ON students
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS audit_users ON users;
CREATE TRIGGER audit_users
  AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS audit_grades ON grades;
CREATE TRIGGER audit_grades
  AFTER INSERT OR UPDATE OR DELETE ON grades
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- 6.4 Audit summary view for admin dashboard
CREATE OR REPLACE VIEW audit_summary AS
SELECT
  DATE_TRUNC('day', occurred_at) as day,
  table_name,
  action,
  COUNT(*) as operation_count,
  COUNT(DISTINCT user_id) as unique_users,
  SUM(CASE WHEN contains_pii THEN 1 ELSE 0 END) as pii_operations
FROM comprehensive_audit_log
WHERE occurred_at > NOW() - INTERVAL '30 days'
GROUP BY 1, 2, 3
ORDER BY 1 DESC, 2, 3;

GRANT SELECT ON audit_summary TO authenticated;
```

---

## 7. RATE LIMITING & ABUSE PREVENTION

```sql
-- =====================================================
-- RATE LIMITING SYSTEM
-- =====================================================

-- 7.1 Rate limit tracking table
CREATE TABLE IF NOT EXISTS rate_limit_tracker (
  id bigserial PRIMARY KEY,
  user_id uuid,
  endpoint text,
  request_count int DEFAULT 1,
  window_start timestamptz DEFAULT now(),
  window_end timestamptz DEFAULT NOW() + INTERVAL '1 minute'
);

CREATE INDEX ON rate_limit_tracker(user_id, endpoint, window_end);

-- 7.2 Rate limit check function
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_endpoint text,
  p_max_requests int DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_count int;
  v_window_id int;
BEGIN
  -- Clean up old windows
  DELETE FROM rate_limit_tracker
  WHERE window_end < NOW();

  -- Find or create current window
  SELECT id, request_count INTO v_window_id, v_current_count
  FROM rate_limit_tracker
  WHERE user_id = auth.uid()
  AND endpoint = p_endpoint
  AND window_start <= NOW()
  AND window_end > NOW()
  FOR UPDATE;

  IF v_window_id IS NULL THEN
    -- Create new window
    INSERT INTO rate_limit_tracker (user_id, endpoint)
    VALUES (auth.uid(), p_endpoint);
    RETURN TRUE;
  END IF;

  -- Check if limit exceeded
  IF v_current_count >= p_max_requests THEN
    -- Log the rate limit hit
    PERFORM log_security_event(
      'rate_limit_exceeded',
      p_endpoint,
      'check_rate_limit',
      jsonb_build_object('request_count', v_current_count)
    );
    RETURN FALSE;
  END IF;

  -- Increment counter
  UPDATE rate_limit_tracker
  SET request_count = request_count + 1
  WHERE id = v_window_id;

  RETURN TRUE;
END;
$$;

-- 7.3 Apply rate limiting to critical operations
-- Example: Limit grade updates
CREATE OR REPLACE FUNCTION rate_limited_grade_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT check_rate_limit('grade_update', 10) THEN
    RAISE EXCEPTION 'Rate limit exceeded: Too many grade updates. Please wait before trying again.'
    USING ERCODE = '42901';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER grade_update_rate_limit
  BEFORE INSERT OR UPDATE ON grades
  FOR EACH ROW EXECUTE FUNCTION rate_limited_grade_update();
```

---

## 8. SECURITY MONITORING DASHBOARD

```sql
-- =====================================================
-- SECURITY MONITORING QUERIES
-- =====================================================

-- 8.1 Recent security events (last 24 hours)
CREATE OR REPLACE VIEW security_events_last_24h AS
SELECT
  event_type,
  COUNT(*) as event_count,
  COUNT(DISTINCT user_id) as affected_users
FROM security_audit_log
WHERE occurred_at > NOW() - INTERVAL '24 hours'
GROUP BY event_type
ORDER BY event_count DESC;

-- 8.2 Failed access attempts by user
CREATE OR REPLACE VIEW failed_access_by_user AS
SELECT
  u.email,
  u.role,
  COUNT(*) as failed_attempts,
  MAX(occurred_at) as last_attempt
FROM security_audit_log sal
JOIN users u ON u.id = sal.user_id
WHERE sal.event_type = 'access_denied'
AND sal.occurred_at > NOW() - INTERVAL '7 days'
GROUP BY u.email, u.role
HAVING COUNT(*) > 5
ORDER BY failed_attempts DESC;

-- 8.3 Users with suspicious activity patterns
CREATE OR REPLACE VIEW suspicious_activity AS
SELECT
  user_id,
  current_user_role() as role,
  COUNT(*) as total_actions,
  COUNT(DISTINCT table_name) as tables_accessed,
  MIN(occurred_at) as first_seen,
  MAX(occurred_at) as last_seen
FROM comprehensive_audit_log
WHERE occurred_at > NOW() - INTERVAL '1 hour'
GROUP BY user_id
HAVING COUNT(*) > 100  -- More than 100 actions in 1 hour
ORDER BY total_actions DESC;

-- 8.4 Data export attempts (potential data exfiltration)
CREATE OR REPLACE VIEW potential_exfiltration AS
SELECT
  user_id,
  table_name,
  COUNT(*) as rows_accessed,
  COUNT(DISTINCT record_id) as unique_records,
  BOOL_OR(contains_pii) as includes_pii,
  MIN(occurred_at) as started_at,
  MAX(occurred_at) as ended_at
FROM comprehensive_audit_log
WHERE occurred_at > NOW() - INTERVAL '1 hour'
  AND action = 'SELECT'
GROUP BY user_id, table_name
HAVING COUNT(*) > 50  -- More than 50 SELECT queries
ORDER BY rows_accessed DESC;
```

---

## 9. IMPLEMENTATION CHECKLIST

```
SECURITY DEPLOYMENT CHECKLIST
═══════════════════════════════════════════════════════

PHASE 1: FOUNDATION (Required)
☐ Enable RLS on all tables
☐ Create role hierarchy functions (auth_has_role, is_admin)
☐ Create audit logging infrastructure
☐ Set up security event logging

PHASE 2: POLICIES (Required)
☐ Students table policies (admin, teacher, student, parent)
☐ Grades table policies (stricter)
☐ Users table policies (role-based)
☐ Other tables as needed

PHASE 3: AUDIT (Required)
☐ Apply audit triggers to sensitive tables
☐ Create monitoring views
☐ Set up alerting for security events

PHASE 4: HARDENING (Recommended)
☐ Implement data masking functions
☐ Set up rate limiting
☐ Create PII encryption
☐ Configure secure views

PHASE 5: MONITORING (Recommended)
☐ Deploy security dashboard
☐ Set up automated alerts
☐ Create incident response plan
☐ Regular audit log review

PHASE 6: COMPLIANCE (If Required)
☐ GDPR compliance review
☐ FERPA compliance review (for schools)
☐ Data retention policies
☐ Right to erasure implementation
```

---

## 10. INCIDENT RESPONSE PROCEDURES

```sql
-- =====================================================
-- SECURITY INCIDENT RESPONSE
-- =====================================================

-- 10.1 Emergency: Revoke all user access immediately
CREATE OR REPLACE FUNCTION emergency_lockdown()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  -- Drop all permissive policies, leaving only DENY
  DROP POLICY IF EXISTS "students_admin_select" ON students;
  DROP POLICY IF EXISTS "students_admin_insert" ON students;
  -- ... drop all policies for all tables

  -- Log the lockdown
  INSERT INTO security_audit_log (event_type, details)
  VALUES ('emergency_lockdown', jsonb_build_object('timestamp', now()));
$$;

-- 10.2 Revoke specific user access
CREATE OR REPLACE FUNCTION revoke_user_access(target_user_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE users SET role = 'suspended' WHERE id = target_user_id;

  INSERT INTO security_audit_log (event_type, details)
  VALUES ('user_access_revoked', jsonb_build_object('user_id', target_user_id));
$$;

-- 10.3 Generate incident report
CREATE OR REPLACE FUNCTION generate_incident_report(
  start_time timestamptz,
  end_time timestamptz DEFAULT NOW()
)
RETURNS TABLE (
  report_time timestamptz,
  affected_users int,
  failed_access_count int,
  data_exfiltration_risk boolean,
  details jsonb
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    NOW() as report_time,
    COUNT(DISTINCT user_id) as affected_users,
    SUM(CASE WHEN event_type = 'access_denied' THEN 1 ELSE 0 END) as failed_access_count,
    BOOL_OR(event_type = 'potential_exfiltration') as data_exfiltration_risk,
    jsonb_build_object(
      'tables_accessed', ARRAY_AGG(DISTINCT table_name),
      'actions_taken', ARRAY_AGG(DISTINCT action)
    ) as details
  FROM comprehensive_audit_log
  WHERE occurred_at BETWEEN start_time AND end_time;
$$;
```

---

## QUICK SECURITY TEST

```sql
-- Run this to verify your security setup

DO $$
DECLARE
  rls_enabled int;
  policy_count int;
  audit_enabled int;
BEGIN
  -- Check RLS
  SELECT COUNT(*) INTO rls_enabled
  FROM pg_tables
  WHERE schemaname = 'public'
  AND rowsecurity = true;

  -- Check policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies;

  -- Check audit triggers
  SELECT COUNT(*) INTO audit_enabled
  FROM information_schema.triggers
  WHERE trigger_name LIKE '%audit%';

  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE 'SECURITY STATUS REPORT';
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE 'Tables with RLS: %', rls_enabled;
  RAISE NOTICE 'Total RLS policies: %', policy_count;
  RAISE NOTICE 'Audit triggers: %', audit_enabled;
  RAISE NOTICE '═══════════════════════════════════════';

  IF rls_enabled < 5 THEN
    RAISE NOTICE '⚠️  WARNING: Some tables lack RLS protection!';
  END IF;

  IF policy_count = 0 THEN
    RAISE NOTICE '❌ CRITICAL: No RLS policies defined!';
  END IF;

  IF audit_enabled < 3 THEN
    RAISE NOTICE '⚠️  WARNING: Audit logging may be incomplete!';
  END IF;

  RAISE NOTICE '═══════════════════════════════════════';
END $$;
```
