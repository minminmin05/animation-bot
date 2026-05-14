# Dynamic Access Control System - Implementation Summary

## Overview

Replaced hardcoded role checks with a flexible, policy-based access control system. Access permissions are now stored in the database and can be modified without code changes.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Request Flow                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Authenticate & Get User Role                            │
│     (userId, userRole from auth token)                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Check Access Policy                                     │
│     getAccessScope(role, resource, action)                  │
│     → Returns: SELF | CHILDREN | CLASS | ALL | NONE        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Apply Scope-Based Filter                                │
│     - SELF: Filter to user's own data                       │
│     - CHILDREN: Filter to parent's children                 │
│     - CLASS: Filter to teacher's class students             │
│     - ALL: No filter (admin, with logging)                  │
│     - NONE: Deny access                                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Execute Query with Filter                               │
│     SELECT * FROM table WHERE student_id IN (allowed_ids)   │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

### access_policies Table

```sql
CREATE TABLE public.access_policies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    description text,
    role text NOT NULL,              -- student, teacher, parent, admin, public
    resource text NOT NULL,          -- grades, attendance, schedule, etc.
    action text NOT NULL,            -- read, write, delete, manage, query
    scope text NOT NULL,             -- SELF, CHILDREN, CLASS, ALL, NONE
    priority integer DEFAULT 0,
    enabled boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
```

## Access Scopes

| Scope | Description | Example Use |
|-------|-------------|-------------|
| `SELF` | Only own data | Student viewing own grades |
| `CHILDREN` | Children's data | Parent viewing child's attendance |
| `CLASS` | Class students data | Teacher viewing class grades |
| `ALL` | All data (admin) | Admin viewing all records |
| `NONE` | No access | Deny access explicitly |

## Code Changes

### Before (Hardcoded)
```typescript
// ❌ Old way - hardcoded role check
if (userRole !== 'admin' && userRole !== 'teacher') {
  throw new Error('Unauthorized')
}
const grades = await fetchGrades() // No filtering!
```

### After (Policy-based)
```typescript
// ✅ New way - dynamic policy check
const scope = await getAccessScope(userRole, 'grades', 'read')

if (scope === AccessScope.NONE) {
  throw new Error('ACCESS_DENIED')
}

// Apply filter based on scope
const studentIds = await getStudentIdsByScope(scope, userContext)
const grades = await fetchGrades()
  .in('student_id', studentIds.length > 0 ? studentIds : [''])
```

## Files Modified

1. **server/services/grade.service.ts**
   - Removed hardcoded `validateAccess()` function
   - Added `buildUserContext()` for getting role-specific IDs
   - Added `getStudentIdsByScope()` for scope-based filtering
   - Updated `getStudentGrades()`, `getStudentAttendance()`, `getStudentSchedule()`
   - Added admin access logging

2. **server/services/access.service.ts** (already existed)
   - `getAccessScope()` - Main function for checking policies
   - `checkAccess()` - Comprehensive access validation
   - `buildScopeFilter()` - Database filter builder
   - `getPoliciesForRole()` - Debug/admin function

3. **server/services/access-control-examples.ts** (new)
   - Usage examples and patterns
   - Security checklist
   - Common mistakes to avoid

## Policy Seed Data

Default policies created in migration:

```sql
-- Students can read own data
('student_read_own_grades', 'student', 'grades', 'read', 'SELF', 100)
('student_read_own_attendance', 'student', 'attendance', 'read', 'SELF', 100)
('student_read_own_schedule', 'student', 'schedule', 'read', 'SELF', 100)

-- Teachers can read/write class data
('teacher_read_class_grades', 'teacher', 'grades', 'read', 'CLASS', 100)
('teacher_read_class_attendance', 'teacher', 'attendance', 'read', 'CLASS', 100)
('teacher_write_grades', 'teacher', 'grades', 'write', 'CLASS', 100)

-- Parents can read children's data
('parent_read_child_grades', 'parent', 'grades', 'read', 'CHILDREN', 100)
('parent_read_child_attendance', 'parent', 'attendance', 'read', 'CHILDREN', 100)

-- Admins can do everything
('admin_manage_all', 'admin', 'all', 'manage', 'ALL', 1000)
```

## Security Features

1. **Never trust frontend** - All access checks on backend
2. **Fail securely** - Default to NONE scope on errors
3. **Admin logging** - All admin access is logged with timestamp
4. **Scope enforcement** - Data filtered based on user's scope
5. **Action-based** - Separate policies for read, write, delete, manage

## Usage Examples

### Example 1: Check access before operation
```typescript
import { getAccessScope, AccessScope } from './services/access.service'

const scope = await getAccessScope(userRole, 'grades', 'read')

if (scope === AccessScope.NONE) {
  return { error: 'ACCESS_DENIED' }
}

// Proceed with filtered query
```

### Example 2: Get accessible student IDs
```typescript
import { getAccessibleStudentIds } from './services/grade.service'

const studentIds = await getAccessibleStudentIds(userId, userRole, 'grades')

// Use in query
const data = await supabase
  .from('student_grades')
  .select('*')
  .in('student_id', studentIds.length > 0 ? studentIds : [''])
```

### Example 3: Admin access with logging
```typescript
const scope = await getAccessScope(userRole, 'grades', 'read')

if (scope === AccessScope.ALL) {
  // Log for audit
  console.log({
    admin_access: true,
    admin_id: userId,
    resource: 'grades',
    timestamp: new Date().toISOString()
  })
}
```

## Migration

Apply the migration:

```bash
# The migration file is already created at:
# supabase/migrations/20260506_create_access_policies.sql

# Apply via Supabase CLI or dashboard
supabase migration up
```

## Testing

Test the access control:

```typescript
// Test 1: Student accessing own grades (SELF scope)
const studentScope = await getAccessScope('student', 'grades', 'read')
console.log(studentScope) // Should be 'SELF'

// Test 2: Teacher accessing class grades (CLASS scope)
const teacherScope = await getAccessScope('teacher', 'grades', 'read')
console.log(teacherScope) // Should be 'CLASS'

// Test 3: Parent accessing child grades (CHILDREN scope)
const parentScope = await getAccessScope('parent', 'grades', 'read')
console.log(parentScope) // Should be 'CHILDREN'

// Test 4: Admin accessing all (ALL scope)
const adminScope = await getAccessScope('admin', 'grades', 'read')
console.log(adminScope) // Should be 'ALL'

// Test 5: Invalid access
const invalidScope = await getAccessScope('student', 'admin_settings', 'write')
console.log(invalidScope) // Should be 'NONE'
```

## Modifying Policies

To change access permissions, update the database:

```sql
-- Enable teachers to write attendance (if not already enabled)
INSERT INTO access_policies (name, role, resource, action, scope, priority)
VALUES ('teacher_write_attendance', 'teacher', 'attendance', 'write', 'CLASS', 100)
ON CONFLICT (name) DO UPDATE SET enabled = true;

-- Temporarily disable parent access to grades
UPDATE access_policies
SET enabled = false
WHERE role = 'parent' AND resource = 'grades';

-- Give students read access to knowledge base
INSERT INTO access_policies (name, role, resource, action, scope, priority)
VALUES ('student_query_knowledge_base', 'student', 'knowledge_base', 'query', 'ALL', 50);
```

## Query Examples

### SELF Scope (Student)
```sql
-- Applied filter: student_id = ?
SELECT * FROM student_grades WHERE student_id = 'student-uuid-123'
```

### CHILDREN Scope (Parent)
```sql
-- Applied filter: student_id IN (...)
SELECT * FROM student_grades
WHERE student_id IN (
  SELECT student_id FROM student_parent_relations
  WHERE parent_id = 'parent-uuid-456'
)
```

### CLASS Scope (Teacher)
```sql
-- Applied filter: student_id IN (...)
SELECT * FROM student_grades
WHERE student_id IN (
  SELECT student_id FROM student_class_enrollments
  WHERE class_section_id IN (
    SELECT class_section_id FROM teacher_class_assignments
    WHERE teacher_id = 'teacher-uuid-789' AND status = 'active'
  )
)
```

### ALL Scope (Admin)
```sql
-- No filter - admin sees everything
SELECT * FROM student_grades
-- Logged: Admin access at {timestamp}
```

## Key Benefits

1. **Flexibility** - Change permissions without code deployment
2. **Auditability** - All admin access is logged
3. **Security** - Consistent enforcement across all endpoints
4. **Maintainability** - Single source of truth for permissions
5. **Granularity** - Control by role, resource, and action

## Next Steps

1. ✅ Migration created (`20260506_create_access_policies.sql`)
2. ✅ Service updated (`grade.service.ts`)
3. ✅ Examples documented (`access-control-examples.ts`)
4. ⏳ Apply migration to database
5. ⏳ Update other services (attendance.service.ts, schedule.service.ts)
6. ⏳ Add admin audit log table for comprehensive logging
7. ⏳ Consider caching policies for performance
