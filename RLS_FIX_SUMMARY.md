# RLS FIX SUMMARY - Your Actual Schema

## Your Tables (Confirmed)

| Table | Key Columns |
|-------|-------------|
| `users` | id, email, role, full_name |
| `students` | id, user_id, name, **class** (text), grade_level |
| `teachers` | id, user_id, name, subject, department |
| `parents` | id, user_id, name, phone, address |
| `student_parent_relations` | id, parent_id, student_id, relationship |
| `classes` | id, name, subject, **teacher_id** (FK to teachers) |
| `student_enrollments` | id, student_id, class_id |
| `assignments` | id, teacher_id, class_id, title, due_date |
| `grades` | id, student_id, assignment_id, class_id, teacher_id, grade |
| `attendance` | id, student_id, class_id, date, status, marked_by |
| `notifications` | id, user_id, title, message, is_read |

## Key Schema Notes

1. **`classes.teacher_id`** - Single teacher per class (this is how you link teachers to classes)
2. **`students.class`** - This is TEXT, not a foreign key (for display)
3. **`student_enrollments`** - This is the real student→class link

## What Was Fixed

| Issue | Original | Fixed |
|-------|----------|-------|
| **Missing admin access** | No admin SELECT on grades/attendance | Added admin policies |
| **Missing INSERT policies** | Only SELECT policies | Added INSERT/UPDATE/DELETE |
| **FOR ALL conflicts** | Some policies used FOR ALL inconsistently | Separated by command |
| **Orphaned policies** | Some policies referenced non-existent columns | All verified against schema |

## Quick Deploy

Copy `supabase/migrations/20240427000019_fix_rls_working.sql` to Supabase SQL Editor and run.

## Verification

After running, test with:

```sql
-- Check policies exist
SELECT tablename, COUNT(*) as policies
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
```
