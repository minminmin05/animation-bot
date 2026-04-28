# Student Management Page - Verification Checklist

## Step 1: Verify Data Exists in Supabase

Run in Supabase SQL Editor:

```sql
-- Check students table
SELECT COUNT(*) FROM students;

-- Check users table
SELECT COUNT(*) FROM users;

-- Verify foreign key relationship
SELECT column_name, foreign_table_name, foreign_column_name
FROM information_schema.table_foreign_keys
WHERE table_name = 'students';
```

**Expected Result:** Both queries should return numbers > 0

---

## Step 2: Test SQL Join Manually

```sql
SELECT
  s.id,
  s.name,
  s.class,
  s.grade_level,
  u.email,
  u.full_name
FROM students s
LEFT JOIN users u ON s.user_id = u.id
LIMIT 5;
```

**Expected Result:** Should show students with their associated user emails

---

## Step 3: Check RLS Status

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('students', 'users');

-- If rowsecurity = true for students, check policies
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'students';
```

**Expected Result:** If RLS is enabled, you should see at least one SELECT policy

---

## Step 4: Test the Frontend

1. Start your dev server: `npm run dev`
2. Navigate to `/admin/students` (or your admin route)
3. Open Browser DevTools Console
4. Look for log messages:
   - ✅ "🔍 Fetching students..."
   - ✅ "✅ Students fetched: X"
   - ❌ Any errors in red

**Expected Result:** Console should show "Students fetched: X" with X > 0

---

## Step 5: Verify Data Display

1. Check the page displays student data in a table
2. Verify each row shows:
   - Student name with avatar
   - Email from the users table
   - Class and grade level
   - Phone number
   - Enrollment date

**Expected Result:** All fields populated (except those that are null in DB)

---

## Step 6: Test Error States

1. Test empty state: Clear students table temporarily
   ```sql
   -- Temporarily hide students (don't delete!)
   CREATE TEMP TABLE students_backup AS SELECT * FROM students;
   DELETE FROM students;
   ```
   - Should show "No Students Found" empty state

2. Test error state: Break the query (use wrong table name)
   - Should show error message with debug steps

**Restore after testing:**
```sql
INSERT INTO students SELECT * FROM students_backup;
```

---

## Common Issues & Fixes

| Issue | Symptom | Fix |
|-------|---------|-----|
| No data shown | "No students found" | Run Step 1 to verify data exists |
| RLS blocking | Console shows "permission denied" | Apply RLS fix from Step 5 |
| Wrong join | `user` field always null | Check foreign key: `user_id` → `users.id` |
| Wrong table name | Error "relation X does not exist" | Verify table name: `users` not `user` |

---

## Quick Debug Command

Run this in browser console when on Student Management page:

```javascript
// Check if Supabase client is configured
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);

// Manual query test
const { supabase } = await import('../../config/supabaseClient');
const { data, error } = await supabase.from('students').select('*');
console.log('Raw students:', data);
console.log('Error:', error);
```
