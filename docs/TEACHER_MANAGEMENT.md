# Teacher Management Page - Documentation

## Overview

Complete Teacher Management page for the school administration system. Built with React, TypeScript, Tailwind CSS, and Supabase.

## Architecture

### Component Structure

```
TeacherManagement (Main Container)
├── Header Section
│   ├── Title & Description
│   └── Add Teacher Button
├── Filter Bar
│   ├── Search Input
│   ├── Department Filter
│   └── Subject Filter
├── Teachers Table
│   ├── Avatar Column
│   ├── Name/Email Column
│   ├── Department Badge
│   ├── Subject Display
│   ├── Class Count Badge
│   └── Action Buttons (Edit/Delete)
└── Dialogs/Drawers
    ├── TeacherFormDialog (Create/Edit)
    ├── TeacherDetailDrawer (View Details)
    └── DeleteConfirmDialog
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERACTION                        │
└─────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│                         REACT COMPONENTS                        │
│  TeacherManagement → State (teachers, filters, dialogs)        │
└─────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│                       SUPABASE CLIENT                           │
│  centralSupabase (Isolated auth context for admin)             │
└─────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE QUERIES                           │
│  • teachers JOIN users (get email, full_name)                  │
│  • classes COUNT (get workload)                                │
│  • RPC functions (for secure mutations)                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema Integration

### Tables Used

| Table | Purpose |
|-------|---------|
| `auth.users` | Authentication records (managed by Supabase) |
| `public.users` | Profile data with role field |
| `teachers` | Teacher-specific profiles (linked via `user_id`) |
| `classes` | Class assignments (linked via `teacher_id`) |

### Key Relationships

```sql
-- Teacher to User
teachers.user_id → users.id → auth.users(id)

-- Teacher to Classes
classes.teacher_id → teachers.id
```

### Query Examples

#### Fetch Teachers with User Data
```typescript
const { data } = await supabase
  .from('teachers')
  .select(`
    id, user_id, name, subject, department, employee_id,
    phone, qualifications, hire_date,
    users!inner (email, role, full_name)
  `)
```

#### Count Teacher Classes
```typescript
const { count } = await supabase
  .from('classes')
  .select('*', { count: 'exact', head: true })
  .eq('teacher_id', teacherId)
```

---

## Supabase Integration

### Client Used

```typescript
import { centralSupabase } from '@/integrations/supabase/central-client'
```

The `centralSupabase` client uses isolated storage to prevent auth conflicts with other role-based clients (student, teacher, parent).

### CRUD Operations

#### Create Teacher
```typescript
// 1. Create auth user (handled by trigger creates users record)
const { data: { user }, error } = await supabase.auth.signUp({
  email: data.email,
  password: temporaryPassword,
  options: {
    data: { role: 'teacher', full_name: data.name }
  }
})

// 2. Create teacher profile
await supabase.from('teachers').insert({
  user_id: user.id,
  name: data.name,
  subject: data.subject,
  department: data.department,
  // ... other fields
})
```

#### Update Teacher
```typescript
await supabase
  .from('teachers')
  .update({ name, subject, department, ... })
  .eq('id', teacherId)
```

#### Delete Teacher
```typescript
await supabase
  .from('teachers')
  .delete()
  .eq('id', teacherId)
// CASCADE handles related records
```

---

## TypeScript Types

```typescript
interface Teacher {
  id: string                  // Primary key
  user_id: string            // FK to users table
  name: string               // Display name
  subject: string            // Primary subject
  department: string         // Department
  employee_id: string | null // Employee code
  phone: string | null       // Contact phone
  qualifications: string | null
  hire_date: string          // ISO date string
  email: string              // From users join
  full_name: string          // From users join
  class_count: number        // Aggregate count
  created_at: string
}
```

---

## UI Components Used

| Component | Source | Purpose |
|-----------|--------|---------|
| `Button` | `@/components/ui/button` | Actions, form submissions |
| `Input` | `@/components/ui/input` | Text input fields |
| `Label` | `@/components/ui/label` | Form labels |
| `Badge` | `@/components/ui/badge` | Status indicators, department tags |
| `Dialog` | `@/components/ui/dialog` | Modals for forms and confirmations |
| `Select` | `@/components/ui/select` | Dropdown filters |
| `useToast` | `@/hooks/use-toast` | Notifications |

---

## Features Implemented

### 1. Teacher List Table
- Sortable columns (by default, ordered by creation date)
- Click-to-view details on any row
- Avatar with consistent color based on name
- Department badges with color coding
- Class count indicator

### 2. Search & Filter
- Real-time search by name, email, or employee ID
- Filter by department
- Filter by subject
- Filters work together (combinatorial)

### 3. Create Teacher
- Form validation
- Email uniqueness check (via Supabase)
- Creates auth user + profile
- Department/Subject dropdowns with predefined values

### 4. Edit Teacher
- Pre-populated form
- Email locked after creation (security)
- Updates profile only (not auth)

### 5. Delete Teacher
- Confirmation dialog
- Shows class count warning
- Cascade deletes related records

### 6. Teacher Detail Drawer
- Full teacher information
- Contact details
- Assigned classes list
- Quick edit access

### 7. UX Improvements
- Loading skeleton states
- Empty state with call-to-action
- Toast notifications for success/error
- Hover states on table rows
- Disabled states during operations

---

## Production Recommendations

### 1. Use Edge Functions for Teacher Creation

Instead of creating auth users directly from the client, use an Edge Function:

```typescript
// supabase/functions/create-teacher/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { name, email, subject, department } = await req.json()

  // Verify request is from admin
  const authHeader = req.headers.get('Authorization')
  // ... validation

  // Create auth user with admin privileges
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: { user }, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: generatePassword(),
    email_confirm: true,
    user_metadata: { role: 'teacher', full_name: name }
  })

  // Create teacher profile
  await supabaseAdmin.from('teachers').insert({
    user_id: user.id,
    name,
    subject,
    department
  })

  return new Response(JSON.stringify({ success: true }), { status: 200 })
})
```

### 2. Implement Row Level Security (RLS)

Already implemented in migrations. Ensure these policies exist:

```sql
-- Teachers can view their own profile
CREATE POLICY "Teachers can view own profile"
  ON teachers FOR SELECT
  USING (user_id = auth.uid());

-- Admins can do everything
CREATE POLICY "Admins can manage teachers"
  ON teachers FOR ALL
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));
```

### 3. Add Audit Logging

Track who made changes to teacher records:

```sql
CREATE TABLE teacher_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES teachers(id),
  action TEXT NOT NULL, -- 'created', 'updated', 'deleted'
  changed_by UUID REFERENCES users(id),
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to log changes
CREATE OR REPLACE FUNCTION log_teacher_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO teacher_audit_log (teacher_id, action, changed_by, old_data, new_data)
  VALUES (
    COALESCE(OLD.id, NEW.id),
    TG_OP,
    auth.uid(),
    row_to_json(OLD),
    row_to_json(NEW)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER teacher_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON teachers
  FOR EACH ROW EXECUTE FUNCTION log_teacher_changes();
```

### 4. Email Invitations

When creating a teacher, send an invitation email:

```typescript
// After creating user, send invite
await supabase.auth.admin.inviteUserByEmail(email, {
  data: { role: 'teacher', full_name: name }
})
```

### 5. Pagination

For large teacher counts, add pagination:

```typescript
const { data } = await supabase
  .from('teachers')
  .select('*, users(email)')
  .range(page * pageSize, (page + 1) * pageSize - 1)
```

### 6. Caching Strategy

Consider caching teacher list to reduce database load:

```typescript
import { useQuery } from '@tanstack/react-query'

const { data } = useQuery({
  queryKey: ['teachers'],
  queryFn: fetchTeachers,
  staleTime: 5 * 60 * 1000, // 5 minutes
})
```

### 7. Error Handling Improvements

Add specific error messages for common issues:

```typescript
if (error.code === '23505') { // Unique violation
  return 'A teacher with this email already exists'
}
if (error.code === '23503') { // Foreign key violation
  return 'Cannot delete: teacher has assigned classes'
}
```

### 8. Add Loading Indicators for Mutations

Show loading state during create/update/delete:

```typescript
const [isMutating, setIsMutating] = useState(false)

const handleDelete = async () => {
  setIsMutating(true)
  try {
    await deleteTeacher(teacherId)
  } finally {
    setIsMutating(false)
  }
}
```

---

## File Locations

| File | Path |
|------|------|
| Main Component | `src/pages/admin/TeacherManagement.tsx` |
| Supabase Client | `src/integrations/supabase/central-client.ts` |
| UI Components | `src/components/ui/` |
| Toast Hook | `src/hooks/use-toast.ts` |
| Route Definition | `src/App.jsx` |

---

## Usage

### Access the Page

Navigate to: `/admin/teachers`

### Required Role

User must have `role = 'admin'` or `role = 'owner'` in the `users` table.

---

## Future Enhancements

1. **Bulk Import**: CSV upload for multiple teachers
2. **Teacher Availability**: Schedule and availability management
3. **Performance Metrics**: Track teacher performance over time
4. **Document Management**: Upload qualifications, certifications
5. **Teacher Directory**: Public-facing directory for students/parents
6. **Substitute Management**: Handle substitute teacher assignments
7. **Export**: Export teacher list to PDF/Excel
