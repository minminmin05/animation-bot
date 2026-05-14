# Academic Year System Design

## Overview

This is a production-ready academic year management system for school management applications. It supports multiple academic years, semester-based enrollment, student progression tracking, and complete historical data preservation.

---

## Architecture

### Core Entity Relationships

```
academic_years (1) ────< (N) semesters
       │
       │ (1:N)
       ▼
class_sections (N) ────< (1) grade_levels
       │
       │ (1:N via teacher_class_assignments)
       ▼
    teachers

class_sections (1) ────< (N) student_class_enrollments
                                    │
                                    │ (N:1)
                                    ▼
                                  students
                                    │
                                    │ (1:N)
                                    ▼
                    student_academic_records (tracks progression per year)
```

---

## Table Definitions

### 1. `academic_years`
**Purpose**: Container for academic years (e.g., "2024-2025", "2025-2026")

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| name | TEXT UNIQUE | e.g., "2024-2025" |
| start_date | DATE | Year start |
| end_date | DATE | Year end |
| is_current | BOOLEAN | Quick lookup flag |
| status | ENUM | upcoming/active/completed/archived |

**Why this design**: Using a dedicated table instead of TEXT fields prevents typos, enables proper relationships, and supports queries like "get all students from 2024-2025".

---

### 2. `semesters`
**Purpose**: Subdivisions within academic years

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| academic_year_id | UUID FK | Parent year |
| name | TEXT | "Fall", "Spring", "Summer" |
| sequence | INTEGER | 1, 2, 3... for ordering |
| start_date | DATE | Semester start |
| end_date | DATE | Semester end |
| is_current | BOOLEAN | Current semester flag |
| status | ENUM | upcoming/active/completed/archived |

**Constraints**: `UNIQUE(academic_year_id, name)` ensures no duplicate semesters per year.

---

### 3. `grade_levels`
**Purpose**: Standard grade levels offered by the school

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| level | INTEGER UNIQUE | 1, 2, 3... 12 |
| name | TEXT | "Grade 1", "Freshman", etc. |
| section | TEXT | Optional: "A", "B", "Advanced" |
| min_age | INTEGER | For validation |
| max_age | INTEGER | For validation |

**Why separate table**: Normalization prevents storing "Grade 5" as repeated text and enables easy queries like "promote all students to level + 1".

---

### 4. `class_sections`
**Purpose**: Actual class offerings tied to specific years/semesters

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| academic_year_id | UUID FK | Required year |
| semester_id | UUID FK | Optional (NULL for year-long) |
| grade_level_id | UUID FK | Required grade level |
| name | TEXT | "Mathematics 101" |
| code | TEXT | "MATH101" |
| section | TEXT | "A", "B", "C" |
| room_number | TEXT | Room identifier |
| schedule | JSONB | Flexible schedule storage |
| max_students | INTEGER | Capacity limit |
| status | ENUM | scheduled/active/completed/cancelled |

**Key Design**: `UNIQUE(academic_year_id, semester_id, code, section)` prevents duplicate classes.

---

### 5. `teacher_class_assignments`
**Purpose**: Many-to-many relationship between teachers and classes

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| class_section_id | UUID FK | Class to teach |
| teacher_id | UUID FK | Teacher |
| role | ENUM | primary/assistant/substitute |
| status | ENUM | active/inactive/ended |

**Why junction table**: One teacher can teach multiple classes; one class can have multiple teachers (e.g., TA).

---

### 6. `student_academic_records`
**Purpose**: **Core progression tracking table** - records a student's status for each academic year

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| student_id | UUID FK | Student |
| academic_year_id | UUID FK | Academic year |
| grade_level_id | UUID FK | Grade level that year |
| section | TEXT | Student's section |
| status | ENUM | enrolled/promoted/retained/withdrawn/transferred/graduated |
| gpa | NUMERIC | Yearly GPA |
| class_rank | INTEGER | Rank within grade |

**Critical Design**:
- `UNIQUE(student_id, academic_year_id)` ensures ONE record per student per year
- This is where "moving to new class" is tracked - create new record each year
- Old records are NEVER updated, preserving complete history

---

### 7. `student_class_enrollments`
**Purpose**: Specific class enrollments within a year/semester

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| student_id | UUID FK | Student |
| class_section_id | UUID FK | Specific class |
| academic_year_id | UUID FK | Denormalized for performance |
| semester_id | UUID FK | Optional semester |
| status | ENUM | active/withdrawn/completed/auditing |
| final_grade | NUMERIC | Grade 0-100 |
| letter_grade | TEXT | "A", "B+", etc. |
| credits_earned | NUMERIC | Credits for this class |

**Key Design**: `UNIQUE(student_id, class_section_id, semester_id)` prevents duplicate enrollments.

---

## Helper Functions

### Get Current Academic Year/Semester
```sql
SELECT get_current_academic_year(); -- Returns UUID
SELECT get_current_semester(); -- Returns UUID
```

### Promote Students to Next Grade
```sql
SELECT promote_students(
  'from-year-uuid',  -- Current academic year
  'to-year-uuid'     -- Next academic year
);
-- Returns: {"success": true, "promoted": 150}
```

**What it does**:
1. Finds all students with `status IN ('enrolled', 'promoted')` in source year
2. For each student, finds grade level + 1
3. Creates new `student_academic_record` in next year
4. Updates old record status to `'promoted'`
5. Skips students at maximum grade level (no level + 1 exists)

### Create Academic Year with Semesters
```sql
SELECT create_academic_year(
  '2025-2026',
  '2025-09-01'::DATE,
  '2026-06-30'::DATE,
  '2025-09-01'::DATE,  -- Fall start
  '2025-12-20'::DATE,  -- Fall end
  '2026-01-05'::DATE,  -- Spring start
  '2026-06-30'::DATE   -- Spring end
);
```

### Set Current Academic Period (Race Condition Safe)
```sql
SELECT set_current_academic_period(
  'new-year-uuid',
  'new-semester-uuid'
);
```

**Race condition protection**: Uses `pg_advisory_xact_lock(123456789)` to prevent concurrent updates.

### Bulk Enroll Students
```sql
SELECT bulk_enroll_students(
  'class-uuid',
  ARRAY['student1', 'student2', 'student3']
);
```

---

## Views for Common Queries

### `v_current_classes`
Shows all active classes with teacher and enrollment count:
```sql
SELECT * FROM v_current_classes;
```

### `v_student_academic_status`
Shows each student's current academic standing:
```sql
SELECT * FROM v_student_academic_status
WHERE user_id = auth.uid();
```

### `v_class_roster`
Shows all students in all classes with grades:
```sql
SELECT * FROM v_class_roster
WHERE class_code = 'MATH101';
```

---

## Best Practices

### 1. Student Promotion Workflow

**Recommended sequence at year end**:

```sql
-- 1. Create next academic year
SELECT create_academic_year('2026-2027', ...);

-- 2. Create new class sections for next year
INSERT INTO class_sections (academic_year_id, grade_level_id, name, code, ...)
SELECT 'new-year-id', gl.id, c.name, c.code, ...
FROM grade_levels gl
CROSS JOIN (SELECT DISTINCT name, code FROM class_sections WHERE academic_year_id = 'old-year-id') c;

-- 3. Promote students
SELECT promote_students('old-year-id', 'new-year-id');

-- 4. Enroll promoted students in new classes
-- (Custom logic based on your enrollment rules)

-- 5. Archive old year
SELECT archive_academic_year('old-year-id');

-- 6. Set new current
SELECT set_current_academic_period('new-year-id', 'new-fall-id');
```

### 2. Preventing Data Inconsistency

| Risk | Solution |
|------|----------|
| Duplicate enrollments | `UNIQUE` constraints on `student_class_enrollments` |
| Concurrent promotions | `pg_advisory_xact_lock()` in `set_current_academic_period()` |
| Orphaned enrollments | Foreign keys with `ON DELETE CASCADE` |
| Invalid date ranges | `CHECK (end_date > start_date)` constraints |
| Duplicate semester names | `UNIQUE(academic_year_id, name)` |

### 3. Querying Current Students

```sql
-- Students in current academic year
SELECT s.name, gl.name AS grade, sar.section
FROM student_academic_records sar
JOIN students s ON sar.student_id = s.id
JOIN academic_years ay ON sar.academic_year_id = ay.id
JOIN grade_levels gl ON sar.grade_level_id = gl.id
WHERE ay.is_current = true
  AND sar.status = 'enrolled';
```

### 4. Historical Data Access

```sql
-- All classes a student has ever taken
SELECT cs.name, ay.name AS year, s.name AS semester, sce.final_grade
FROM student_class_enrollments sce
JOIN class_sections cs ON sce.class_section_id = cs.id
JOIN academic_years ay ON cs.academic_year_id = ay.id
LEFT JOIN semesters s ON cs.semester_id = s.id
WHERE sce.student_id = 'student-uuid'
ORDER BY ay.start_date DESC, s.sequence DESC;
```

### 5. RLS Security

Policies are configured for:
- **Admins**: Full access to all tables
- **Teachers**: Read access to their assigned classes
- **Students**: Read-only access to their own records

---

## Common Mistakes to Avoid

### ❌ Don't: Store year as TEXT in students table
```sql
-- BAD
ALTER TABLE students ADD COLUMN current_year TEXT;
```
**Why**: No referential integrity, typo-prone, hard to query

### ✅ Do: Use `student_academic_records`
```sql
-- GOOD
-- Each student has one record per academic year
```

### ❌ Don't: Update old records when promoting
```sql
-- BAD
UPDATE students SET grade = grade + 1 WHERE year = '2024';
```
**Why**: Loses historical data

### ✅ Do: Create new records
```sql
-- GOOD
INSERT INTO student_academic_records (student_id, academic_year_id, grade_level_id, ...)
-- Creates new record, leaves old one intact
```

### ❌ Don't: Use `is_current` as sole filter
```sql
-- RISKY
-- What if multiple years are accidentally marked current?
```

### ✅ Do: Use advisory locks for updates
```sql
-- SAFE
-- set_current_academic_period() uses pg_advisory_xact_lock()
```

---

## Migration Strategy

If you have existing data in the old schema:

```sql
-- 1. Run the new migration files
-- 2. Migrate existing classes to new structure
INSERT INTO academic_years (name, start_date, end_date, is_current, status)
SELECT DISTINCT academic_year,
       DATE(CONCAT(SUBSTRING(academic_year, 1, 4), '-09-01')),
       DATE(CONCAT(SUBSTRING(academic_year, 6, 4), '-06-30')),
       true,
       'active'
FROM classes
ON CONFLICT (name) DO NOTHING;

-- 3. Migrate students to academic_records
-- (Custom based on your data)
```

---

## Example Usage Patterns

### Creating a new school year
```javascript
const { data, error } = await supabase.rpc('create_academic_year', {
  p_name: '2025-2026',
  p_start_date: '2025-09-01',
  p_end_date: '2026-06-30',
  p_fall_start: '2025-09-01',
  p_fall_end: '2025-12-20',
  p_spring_start: '2026-01-05',
  p_spring_end: '2026-06-30'
});
```

### Getting current student's classes
```javascript
const { data } = await supabase
  .from('v_student_academic_status')
  .select('*')
  .eq('user_id', user.id)
  .single();
```

### Promoting all students
```javascript
const { data } = await supabase.rpc('promote_students', {
  p_from_academic_year_id: currentYearId,
  p_to_academic_year_id: nextYearId
});
```
