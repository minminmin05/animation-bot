# COMPLETE RLS SYSTEM DESIGN
## School Management SaaS - Production Security Framework

---

## 1. ROLE PERMISSION MATRIX

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                           ROLE PERMISSION MATRIX                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  TABLE/RESOURCE        │   ADMIN   │  TEACHER  │  STUDENT  │   PARENT      ║
║══════════════════════════════════════════════════════════════════════════════║
║                        │           │           │           │                ║
║  users (all)           │   CRUD    │    R      │    -      │      -         ║
║  users (own profile)   │   CRUD    │   CRUD    │   CRUD    │    CRUD        ║
║                        │           │           │           │                ║
║  students (all)        │   CRUD    │   R*      │    -      │      -         ║
║  students (own)        │   CRUD    │    -      │    R      │      -         ║
║  students (children)   │   CRUD    │    -      │    -      │      R         ║
║                        │           │           │           │                ║
║  teachers (all)        │   CRUD    │    R      │    R      │      R         ║
║  teachers (own)        │   CRUD    │   CRUD    │    -      │      -         ║
║                        │           │           │           │                ║
║  parents (all)         │   CRUD    │    -      │    -      │      -         ║
║  parents (own)         │   CRUD    │    -      │    -      │     CRUD       ║
║                        │           │           │           │                ║
║  classes (all)         │   CRUD    │   R*      │    R**    │     R**        ║
║                        │           │           │           │                ║
║  student_enrollments   │   CRUD    │   R*      │   R(own)  │   R(children)  ║
║                        │           │           │           │                ║
║  grades                │   CRUD    │  CRUD*    │   R(own)  │  R(children)   ║
║                        │           │           │           │                ║
║  attendance            │   CRUD    │  CRUD*    │   R(own)  │  R(children)   ║
║                        │           │           │           │                ║
║  notifications (own)   │   CRUD    │   CRUD    │   CRUD    │    CRUD        ║
║                        │           │           │           │                ║
║  audit_logs            │    R      │    -      │    -      │      -         ║
║                        │           │           │           │                ║
║  *   = Only for assigned classes                               ║
║  **  = Only for enrolled classes (students/parents)              ║
║  R   = Read only                                                 ║
║  CRUD = Create, Read, Update, Delete                             ║
║  -   = No access                                                  ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## 2. ACCESS FLOW DIAGRAMS

### 2.1 Student Access Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         STUDENT ACCESS FLOW                              │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. AUTHENTICATION                                                       │
│     ╔════════════════════════════════════════════════════════════════╗  │
│     ║  User signs in → auth.uid() = user's UUID from auth.users     ║  │
│     ╚════════════════════════════════════════════════════════════════╝  │
│                                   │                                      │
│                                   ▼                                      │
│  2. ROLE VERIFICATION (users table)                                      │
│     ╔════════════════════════════════════════════════════════════════╗  │
│     ║  SELECT role FROM users WHERE id = auth.uid()                  ║  │
│     ║  Result: 'student'                                              ║  │
│     ╚════════════════════════════════════════════════════════════════╝  │
│                                   │                                      │
│                                   ▼                                      │
│  3. STUDENT RECORD LOOKUP (students table)                               │
│     ╔════════════════════════════════════════════════════════════════╗  │
│     ║  RLS Policy: students_student_read_own                         ║  │
│     ║  USING (user_id = auth.uid())                                  ║  │
│     ║                                                                ║  │
│     ║  Query: SELECT * FROM students                                 ║  │
│     ║  Result: ONLY the row where user_id = auth.uid()              ║  │
│     ╚════════════════════════════════════════════════════════════════╝  │
│                                   │                                      │
│                                   ▼                                      │
│  4. ENROLLMENT LOOKUP (student_enrollments table)                         │
│     ╔════════════════════════════════════════════════════════════════╗  │
│     ║  RLS Policy: enrollments_student_read_own                     ║  │
│     ║  USING (student_id IN (                                       ║  │
│     ║    SELECT id FROM students WHERE user_id = auth.uid()        ║  │
│     ║  ))                                                            ║  │
│     ║                                                                ║  │
│     ║  Query: SELECT * FROM student_enrollments                      ║  │
│     ║  Result: ONLY rows for this student's enrollments             ║  │
│     ╚════════════════════════════════════════════════════════════════╝  │
│                                   │                                      │
│                                   ▼                                      │
│  5. GRADES LOOKUP (grades table)                                         │
│     ╔════════════════════════════════════════════════════════════════╗  │
│     ║  RLS Policy: grades_student_read_own                           ║  │
│     ║  USING (student_id IN (                                       ║  │
│     ║    SELECT id FROM students WHERE user_id = auth.uid()        ║  │
│     ║  ))                                                            ║  │
│     ║                                                                ║  │
│     ║  Query: SELECT * FROM grades                                   ║  │
│     ║  Result: ONLY grades for this student                          ║  │
│     ╚════════════════════════════════════════════════════════════════╝  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Teacher Access Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         TEACHER ACCESS FLOW                              │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. AUTHENTICATION → auth.uid() obtained                                  │
│                                   │                                      │
│                                   ▼                                      │
│  2. ROLE VERIFICATION → role = 'teacher'                                  │
│                                   │                                      │
│                                   ▼                                      │
│  3. CLASS ASSIGNMENT LOOKUP (teacher_class_assignments table)              │
│     ╔════════════════════════════════════════════════════════════════╗  │
│     ║  Query:                                                        ║  │
│     ║    SELECT class_name                                          ║  │
│     ║    FROM teacher_class_assignments                             ║  │
│     ║    WHERE teacher_id = auth.uid()                              ║  │
│     ║                                                                ║  │
│     ║  Result: ['Math-101', 'Science-202', ...]                      ║  │
│     ╚════════════════════════════════════════════════════════════════╝  │
│                                   │                                      │
│                                   ▼                                      │
│  4. STUDENTS LOOKUP (students table)                                     │
│     ╔════════════════════════════════════════════════════════════════╗  │
│     ║  RLS Policy: students_teacher_read_assigned                    ║  │
│     ║  USING (class IN (                                            ║  │
│     ║    SELECT class_name FROM teacher_class_assignments           ║  │
│     ║    WHERE teacher_id = auth.uid()                              ║  │
│     ║  ))                                                            ║  │
│     ║                                                                ║  │
│     ║  Query: SELECT * FROM students                                 ║  │
│     ║  Result: ONLY students in assigned classes                    ║  │
│     ╚════════════════════════════════════════════════════════════════╝  │
│                                   │                                      │
│                                   ▼                                      │
│  5. GRADES LOOKUP (grades table)                                         │
│     ╔════════════════════════════════════════════════════════════════╗  │
│     ║  RLS Policy: grades_teacher_manage                            ║  │
│     ║  USING (student_id IN (                                       ║  │
│     ║    SELECT id FROM students                                    ║  │
│     ║    WHERE class IN (                                           ║  │
│     ║      SELECT class_name FROM teacher_class_assignments        ║  │
│     ║      WHERE teacher_id = auth.uid()                            ║  │
│     ║    )                                                          ║  │
│     ║  ))                                                           ║  │
│     ║                                                                ║  │
│     ║  Query: SELECT * FROM grades                                   ║  │
│     ║  Result: ONLY grades for students in assigned classes         ║  │
│     ╚════════════════════════════════════════════════════════════════╝  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Parent Access Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         PARENT ACCESS FLOW                               │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. AUTHENTICATION → auth.uid() obtained                                  │
│                                   │                                      │
│                                   ▼                                      │
│  2. ROLE VERIFICATION → role = 'parent'                                   │
│                                   │                                      │
│                                   ▼                                      │
│  3. CHILDREN LOOKUP (student_parent_relations table)                       │
│     ╔════════════════════════════════════════════════════════════════╗  │
│     ║  Query:                                                        ║  │
│     ║    SELECT student_id                                          ║  │
│     ║    FROM student_parent_relations                             ║  │
│     ║    WHERE parent_id = auth.uid()                               ║  │
│     ║                                                                ║  │
│     ║  Result: ['uuid-1', 'uuid-2', ...] (children's IDs)           ║  │
│     ╚════════════════════════════════════════════════════════════════╝  │
│                                   │                                      │
│                                   ▼                                      │
│  4. STUDENT DATA LOOKUP (students table)                                 │
│     ╔════════════════════════════════════════════════════════════════╗  │
│     ║  RLS Policy: students_parent_read_children                    ║  │
│     ║  USING (id IN (                                              ║  │
│     ║    SELECT student_id FROM student_parent_relations           ║  │
│     ║    WHERE parent_id = auth.uid()                              ║  │
│     ║  ))                                                           ║  │
│     ║                                                                ║  │
│     ║  Query: SELECT * FROM students                                 ║  │
│     ║  Result: ONLY rows for linked children                        ║  │
│     ╚════════════════════════════════════════════════════════════════╝  │
│                                   │                                      │
│                                   ▼                                      │
│  5. CHILD'S GRADES (grades table)                                       │
│     ╔════════════════════════════════════════════════════════════════╗  │
│     ║  RLS Policy: grades_parent_read_children                      ║  │
│     ║  USING (student_id IN (                                       ║  │
│     ║    SELECT student_id FROM student_parent_relations           ║  │
│     ║    WHERE parent_id = auth.uid()                              ║  │
│     ║  ))                                                           ║  │
│     ║                                                                ║  │
│     ║  Query: SELECT * FROM grades                                   ║  │
│     ║  Result: ONLY grades for linked children                      ║  │
│     ╚════════════════════════════════════════════════════════════════╝  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 3. DATABASE SCHEMA (REFERENCE)

```sql
-- =====================================================
-- TABLE STRUCTURE REFERENCE
-- =====================================================

-- users table (links to auth.users)
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  email text UNIQUE NOT NULL,
  full_name text,
  role text NOT NULL CHECK (role IN ('admin', 'teacher', 'student', 'parent')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- students table
CREATE TABLE students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES users(id),
  name text NOT NULL,
  class text,
  grade_level int,
  phone text,
  address text,
  date_of_birth date,
  enrollment_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- teachers table
CREATE TABLE teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES users(id),
  name text NOT NULL,
  subject text,
  department text,
  employee_id text,
  created_at timestamptz DEFAULT now()
);

-- parents table
CREATE TABLE parents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES users(id),
  name text NOT NULL,
  phone text,
  emergency_contact text,
  created_at timestamptz DEFAULT now()
);

-- student_parent_relations (linking table)
CREATE TABLE student_parent_relations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES parents(id) ON DELETE CASCADE,
  relationship_type text CHECK (relationship_type IN ('father', 'mother', 'guardian')),
  is_primary_contact boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(student_id, parent_id)
);

-- teacher_class_assignments (which teacher teaches which class)
CREATE TABLE teacher_class_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid REFERENCES teachers(id) ON DELETE CASCADE,
  class_name text NOT NULL,
  subject text,
  academic_year text,
  assigned_date timestamptz DEFAULT now(),
  UNIQUE(teacher_id, class_name, academic_year)
);

-- classes table
CREATE TABLE classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  grade_level int,
  academic_year text,
  max_students int,
  created_at timestamptz DEFAULT now()
);

-- student_enrollments (which student is in which class)
CREATE TABLE student_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  academic_year text,
  enrollment_date timestamptz DEFAULT now(),
  UNIQUE(student_id, class_id, academic_year)
);

-- grades table
CREATE TABLE grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  class_id uuid REFERENCES classes(id),
  subject text NOT NULL,
  assignment_name text,
  grade numeric(5,2),
  max_grade numeric(5,2) DEFAULT 100,
  term text,
  academic_year text,
  graded_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- attendance table
CREATE TABLE attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  class_id uuid REFERENCES classes(id),
  date date NOT NULL,
  status text CHECK (status IN ('present', 'absent', 'late', 'excused')),
  marked_by uuid REFERENCES users(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(student_id, class_id, date)
);

-- notifications table
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text,
  data jsonb,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_students_user_id ON students(user_id);
CREATE INDEX idx_students_class ON students(class);
CREATE INDEX idx_teachers_user_id ON teachers(user_id);
CREATE INDEX idx_parents_user_id ON parents(user_id);
CREATE INDEX idx_student_parent_student ON student_parent_relations(student_id);
CREATE INDEX idx_student_parent_parent ON student_parent_relations(parent_id);
CREATE INDEX idx_teacher_class_teacher ON teacher_class_assignments(teacher_id);
CREATE INDEX idx_teacher_class_name ON teacher_class_assignments(class_name);
CREATE INDEX idx_enrollments_student ON student_enrollments(student_id);
CREATE INDEX idx_enrollments_class ON student_enrollments(class_id);
CREATE INDEX idx_grades_student ON grades(student_id);
CREATE INDEX idx_grades_class ON grades(class_id);
CREATE INDEX idx_attendance_student ON attendance(student_id);
CREATE INDEX idx_attendance_class ON attendance(class_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
```

---

## 4. SECURITY HELPER FUNCTIONS

```sql
-- =====================================================
-- SECURITY HELPER FUNCTIONS
-- =====================================================

-- Helper: Check if current user has a specific role
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

-- Helper: Get current user's role
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$;

-- Helper: Get student ID for current user (if user is a student)
CREATE OR REPLACE FUNCTION get_student_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM students WHERE user_id = auth.uid();
$$;

-- Helper: Get teacher ID for current user (if user is a teacher)
CREATE OR REPLACE FUNCTION get_teacher_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM teachers WHERE user_id = auth.uid();
$$;

-- Helper: Get parent ID for current user (if user is a parent)
CREATE OR REPLACE FUNCTION get_parent_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM parents WHERE user_id = auth.uid();
$$;

-- Helper: Check if teacher is assigned to a specific class
CREATE OR REPLACE FUNCTION teacher_assigned_to_class(class_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM teacher_class_assignments
    WHERE teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
    AND class_name = $1
  );
$$;

-- Helper: Check if parent is linked to a specific student
CREATE OR REPLACE FUNCTION parent_linked_to_student(student_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM student_parent_relations
    WHERE parent_id = (SELECT id FROM parents WHERE user_id = auth.uid())
    AND student_id = $1
  );
$$;

-- Helper: Get student's class
CREATE OR REPLACE FUNCTION get_student_class(student_id_param uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT class FROM students WHERE id = $1;
$$;
```

---

## 5. COMPLETE RLS POLICIES - ALL TABLES

### 5.1 USERS TABLE

```sql
-- =====================================================
-- USERS TABLE RLS
-- =====================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "users_" ON users;

-- ADMIN: Full access to all users
CREATE POLICY "users_admin_all" ON users
  FOR ALL
  TO authenticated
  USING (auth_has_role('admin'))
  WITH CHECK (auth_has_role('admin'));

-- ALL USERS: Read own profile
CREATE POLICY "users_read_own" ON users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- ALL USERS: Update own profile (with restrictions)
CREATE POLICY "users_update_own" ON users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND -- Cannot change role
    (role IS NOT DISTINCT FROM OLD.role)
    AND -- Cannot change email (use auth for that)
    (email IS NOT DISTINCT FROM OLD.email)
  );

-- STUDENTS: Can read teachers' names (for directory)
CREATE POLICY "users_student_read_teachers" ON users
  FOR SELECT
  TO authenticated
  USING (
    auth_has_role('student')
    AND EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.user_id = users.id
    )
  );

-- PARENTS: Can read their children's teachers
CREATE POLICY "users_parent_read_teachers" ON users
  FOR SELECT
  TO authenticated
  USING (
    auth_has_role('parent')
    AND EXISTS (
      SELECT 1 FROM teachers t
      JOIN student_enrollments se ON se.class_id IN (
        SELECT id FROM classes WHERE name IN (
          SELECT class_name FROM teacher_class_assignments
          WHERE teacher_id = t.id
        )
      )
      JOIN student_parent_relations spr ON spr.student_id = se.student_id
      WHERE spr.parent_id = (SELECT id FROM parents WHERE user_id = auth.uid())
      AND t.user_id = users.id
    )
  );
```

### 5.2 STUDENTS TABLE

```sql
-- =====================================================
-- STUDENTS TABLE RLS
-- =====================================================

ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "students_" ON students;

-- ADMIN: Full access
CREATE POLICY "students_admin_all" ON students
  FOR ALL
  TO authenticated
  USING (auth_has_role('admin'))
  WITH CHECK (auth_has_role('admin'));

-- STUDENT: Read own record only
CREATE POLICY "students_student_read_own" ON students
  FOR SELECT
  TO authenticated
  USING (
    auth_has_role('student')
    AND user_id = auth.uid()
  );

-- STUDENT: Update own limited fields
CREATE POLICY "students_student_update_own" ON students
  FOR UPDATE
  TO authenticated
  USING (
    auth_has_role('student')
    AND user_id = auth.uid()
  )
  WITH CHECK (
    auth_has_role('student')
    AND user_id = auth.uid()
    AND -- Can only update contact info
    (phone IS NOT DISTINCT FROM OLD.phone OR phone IS NOT NULL)
    AND (address IS NOT DISTINCT FROM OLD.address OR address IS NOT NULL)
    AND -- Cannot change class/grade
    (class = OLD.class)
    AND (grade_level = OLD.grade_level)
  );

-- TEACHER: Read students in assigned classes
CREATE POLICY "students_teacher_read_assigned" ON students
  FOR SELECT
  TO authenticated
  USING (
    auth_has_role('teacher')
    AND EXISTS (
      SELECT 1 FROM teacher_class_assignments
      WHERE teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
      AND class_name = students.class
    )
  );

-- PARENT: Read own children
CREATE POLICY "students_parent_read_children" ON students
  FOR SELECT
  TO authenticated
  USING (
    auth_has_role('parent')
    AND id IN (
      SELECT student_id FROM student_parent_relations
      WHERE parent_id = (SELECT id FROM parents WHERE user_id = auth.uid())
    )
  );
```

### 5.3 TEACHERS TABLE

```sql
-- =====================================================
-- TEACHERS TABLE RLS
-- =====================================================

ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "teachers_" ON teachers;

-- ADMIN: Full access
CREATE POLICY "teachers_admin_all" ON teachers
  FOR ALL
  TO authenticated
  USING (auth_has_role('admin'))
  WITH CHECK (auth_has_role('admin'));

-- TEACHER: Read/update own record
CREATE POLICY "teachers_teacher_own" ON teachers
  FOR ALL
  TO authenticated
  USING (
    auth_has_role('teacher')
    AND user_id = auth.uid()
  )
  WITH CHECK (
    auth_has_role('teacher')
    AND user_id = auth.uid()
  );

-- STUDENT: Read all teachers (for directory)
CREATE POLICY "teachers_student_read_all" ON teachers
  FOR SELECT
  TO authenticated
  USING (auth_has_role('student'));

-- PARENT: Read all teachers (for directory)
CREATE POLICY "teachers_parent_read_all" ON teachers
  FOR SELECT
  TO authenticated
  USING (auth_has_role('parent'));
```

### 5.4 PARENTS TABLE

```sql
-- =====================================================
-- PARENTS TABLE RLS
-- =====================================================

ALTER TABLE parents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "parents_" ON parents;

-- ADMIN: Full access
CREATE POLICY "parents_admin_all" ON parents
  FOR ALL
  TO authenticated
  USING (auth_has_role('admin'))
  WITH CHECK (auth_has_role('admin'));

-- PARENT: Read/update own record
CREATE POLICY "parents_parent_own" ON parents
  FOR ALL
  TO authenticated
  USING (
    auth_has_role('parent')
    AND user_id = auth.uid()
  )
  WITH CHECK (
    auth_has_role('parent')
    AND user_id = auth.uid()
  );
```

### 5.5 STUDENT_PARENT_RELATIONS TABLE

```sql
-- =====================================================
-- STUDENT_PARENT_RELATIONS TABLE RLS
-- =====================================================

ALTER TABLE student_parent_relations ENABLE ROW LEVEL SECURITY;

-- ADMIN: Full access
CREATE POLICY "spr_admin_all" ON student_parent_relations
  FOR ALL
  TO authenticated
  USING (auth_has_role('admin'))
  WITH CHECK (auth_has_role('admin'));

-- PARENT: Read own relations
CREATE POLICY "spr_parent_read_own" ON student_parent_relations
  FOR SELECT
  TO authenticated
  USING (
    auth_has_role('parent')
    AND parent_id = (SELECT id FROM parents WHERE user_id = auth.uid())
  );

-- PARENT: Create new relation (link to child)
CREATE POLICY "spr_parent_create" ON student_parent_relations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth_has_role('parent')
    AND parent_id = (SELECT id FROM parents WHERE user_id = auth.uid())
  );

-- STUDENT: Read own relations
CREATE POLICY "spr_student_read_own" ON student_parent_relations
  FOR SELECT
  TO authenticated
  USING (
    auth_has_role('student')
    AND student_id = (SELECT id FROM students WHERE user_id = auth.uid())
  );
```

### 5.6 TEACHER_CLASS_ASSIGNMENTS TABLE

```sql
-- =====================================================
-- TEACHER_CLASS_ASSIGNMENTS TABLE RLS
-- =====================================================

ALTER TABLE teacher_class_assignments ENABLE ROW LEVEL SECURITY;

-- ADMIN: Full access
CREATE POLICY "tca_admin_all" ON teacher_class_assignments
  FOR ALL
  TO authenticated
  USING (auth_has_role('admin'))
  WITH CHECK (auth_has_role('admin'));

-- TEACHER: Read own assignments
CREATE POLICY "tca_teacher_read_own" ON teacher_class_assignments
  FOR SELECT
  TO authenticated
  USING (
    auth_has_role('teacher')
    AND teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
  );
```

### 5.7 CLASSES TABLE

```sql
-- =====================================================
-- CLASSES TABLE RLS
-- =====================================================

ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- ADMIN: Full access
CREATE POLICY "classes_admin_all" ON classes
  FOR ALL
  TO authenticated
  USING (auth_has_role('admin'))
  WITH CHECK (auth_has_role('admin'));

-- TEACHER: Read assigned classes
CREATE POLICY "classes_teacher_read_assigned" ON classes
  FOR SELECT
  TO authenticated
  USING (
    auth_has_role('teacher')
    AND name IN (
      SELECT class_name FROM teacher_class_assignments
      WHERE teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
    )
  );

-- STUDENT: Read enrolled classes
CREATE POLICY "classes_student_read_enrolled" ON classes
  FOR SELECT
  TO authenticated
  USING (
    auth_has_role('student')
    AND id IN (
      SELECT class_id FROM student_enrollments
      WHERE student_id = (SELECT id FROM students WHERE user_id = auth.uid())
    )
  );

-- PARENT: Read children's enrolled classes
CREATE POLICY "classes_parent_read_children" ON classes
  FOR SELECT
  TO authenticated
  USING (
    auth_has_role('parent')
    AND id IN (
      SELECT class_id FROM student_enrollments
      WHERE student_id IN (
        SELECT student_id FROM student_parent_relations
        WHERE parent_id = (SELECT id FROM parents WHERE user_id = auth.uid())
      )
    )
  );
```

### 5.8 STUDENT_ENROLLMENTS TABLE

```sql
-- =====================================================
-- STUDENT_ENROLLMENTS TABLE RLS
-- =====================================================

ALTER TABLE student_enrollments ENABLE ROW LEVEL SECURITY;

-- ADMIN: Full access
CREATE POLICY "enrollments_admin_all" ON student_enrollments
  FOR ALL
  TO authenticated
  USING (auth_has_role('admin'))
  WITH CHECK (auth_has_role('admin'));

-- STUDENT: Read own enrollments
CREATE POLICY "enrollments_student_read_own" ON student_enrollments
  FOR SELECT
  TO authenticated
  USING (
    auth_has_role('student')
    AND student_id = (SELECT id FROM students WHERE user_id = auth.uid())
  );

-- TEACHER: Read enrollments for assigned classes
CREATE POLICY "enrollments_teacher_read_assigned" ON student_enrollments
  FOR SELECT
  TO authenticated
  USING (
    auth_has_role('teacher')
    AND class_id IN (
      SELECT id FROM classes WHERE name IN (
        SELECT class_name FROM teacher_class_assignments
        WHERE teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
      )
    )
  );

-- PARENT: Read children's enrollments
CREATE POLICY "enrollments_parent_read_children" ON student_enrollments
  FOR SELECT
  TO authenticated
  USING (
    auth_has_role('parent')
    AND student_id IN (
      SELECT student_id FROM student_parent_relations
      WHERE parent_id = (SELECT id FROM parents WHERE user_id = auth.uid())
    )
  );
```

### 5.9 GRADES TABLE

```sql
-- =====================================================
-- GRADES TABLE RLS (HIGH SECURITY)
-- =====================================================

ALTER TABLE grades ENABLE ROW LEVEL SECURITY;

-- ADMIN: Full access
CREATE POLICY "grades_admin_all" ON grades
  FOR ALL
  TO authenticated
  USING (auth_has_role('admin'))
  WITH CHECK (auth_has_role('admin'));

-- STUDENT: Read own grades only
CREATE POLICY "grades_student_read_own" ON grades
  FOR SELECT
  TO authenticated
  USING (
    auth_has_role('student')
    AND student_id = (SELECT id FROM students WHERE user_id = auth.uid())
  );

-- TEACHER: Read grades for students in assigned classes
CREATE POLICY "grades_teacher_read_assigned" ON grades
  FOR SELECT
  TO authenticated
  USING (
    auth_has_role('teacher')
    AND EXISTS (
      SELECT 1 FROM students s
      JOIN teacher_class_assignments tca ON tca.class_name = s.class
      WHERE s.id = grades.student_id
      AND tca.teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
    )
  );

-- TEACHER: Create/Update grades for students in assigned classes
CREATE POLICY "grades_teacher_manage_assigned" ON grades
  FOR ALL
  TO authenticated
  USING (
    auth_has_role('teacher')
    AND EXISTS (
      SELECT 1 FROM students s
      JOIN teacher_class_assignments tca ON tca.class_name = s.class
      WHERE s.id = grades.student_id
      AND tca.teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    auth_has_role('teacher')
    AND EXISTS (
      SELECT 1 FROM students s
      JOIN teacher_class_assignments tca ON tca.class_name = s.class
      WHERE s.id = grades.student_id
      AND tca.teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
    )
  );

-- PARENT: Read children's grades
CREATE POLICY "grades_parent_read_children" ON grades
  FOR SELECT
  TO authenticated
  USING (
    auth_has_role('parent')
    AND student_id IN (
      SELECT student_id FROM student_parent_relations
      WHERE parent_id = (SELECT id FROM parents WHERE user_id = auth.uid())
    )
  );
```

### 5.10 ATTENDANCE TABLE

```sql
-- =====================================================
-- ATTENDANCE TABLE RLS
-- =====================================================

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- ADMIN: Full access
CREATE POLICY "attendance_admin_all" ON attendance
  FOR ALL
  TO authenticated
  USING (auth_has_role('admin'))
  WITH CHECK (auth_has_role('admin'));

-- STUDENT: Read own attendance
CREATE POLICY "attendance_student_read_own" ON attendance
  FOR SELECT
  TO authenticated
  USING (
    auth_has_role('student')
    AND student_id = (SELECT id FROM students WHERE user_id = auth.uid())
  );

-- TEACHER: Read/Update attendance for assigned classes
CREATE POLICY "attendance_teacher_manage_assigned" ON attendance
  FOR ALL
  TO authenticated
  USING (
    auth_has_role('teacher')
    AND EXISTS (
      SELECT 1 FROM students s
      JOIN teacher_class_assignments tca ON tca.class_name = s.class
      WHERE s.id = attendance.student_id
      AND tca.teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    auth_has_role('teacher')
    AND EXISTS (
      SELECT 1 FROM students s
      JOIN teacher_class_assignments tca ON tca.class_name = s.class
      WHERE s.id = attendance.student_id
      AND tca.teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
    )
  );

-- PARENT: Read children's attendance
CREATE POLICY "attendance_parent_read_children" ON attendance
  FOR SELECT
  TO authenticated
  USING (
    auth_has_role('parent')
    AND student_id IN (
      SELECT student_id FROM student_parent_relations
      WHERE parent_id = (SELECT id FROM parents WHERE user_id = auth.uid())
    )
  );
```

### 5.11 NOTIFICATIONS TABLE

```sql
-- =====================================================
-- NOTIFICATIONS TABLE RLS
-- =====================================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ADMIN: Full access
CREATE POLICY "notifications_admin_all" ON notifications
  FOR ALL
  TO authenticated
  USING (auth_has_role('admin'))
  WITH CHECK (auth_has_role('admin'));

-- ALL USERS: Full access to own notifications
CREATE POLICY "notifications_own" ON notifications
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

---

## 6. VERIFICATION QUERIES

```sql
-- =====================================================
-- VERIFICATION - TEST YOUR RLS POLICIES
-- =====================================================

-- View all policies for all tables
SELECT
  tablename,
  policyname,
  cmd,
  roles,
  CASE
    WHEN qual IS NOT NULL THEN 'filtered'
    ELSE 'all'
  END as scope
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;

-- Count policies per table
SELECT
  tablename,
  COUNT(*) as policy_count,
  STRING_AGG(DISTINCT cmd, ', ') as operations
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- Check RLS status on all tables
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Comprehensive security check
DO $$
DECLARE
  rls_count int;
  policy_count int;
BEGIN
  SELECT COUNT(*) INTO rls_count
  FROM pg_tables
  WHERE schemaname = 'public' AND rowsecurity = true;

  SELECT COUNT(*) INTO policy_count
  FROM pg_policies;

  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE 'RLS SECURITY STATUS';
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE 'Tables with RLS: %', rls_count;
  RAISE NOTICE 'Total policies: %', policy_count;
  RAISE NOTICE '═══════════════════════════════════════';

  IF rls_count = 0 THEN
    RAISE NOTICE '❌ CRITICAL: No RLS enabled!';
  ELSIF policy_count = 0 THEN
    RAISE NOTICE '❌ CRITICAL: RLS enabled but no policies!';
  ELSE
    RAISE NOTICE '✅ RLS appears configured';
  END IF;
END $$;
```

---

## 7. ROLE-BASED TEST QUERIES

```sql
-- =====================================================
-- TEST EACH ROLE'S ACCESS
-- =====================================================

-- Replace these IDs with actual UUIDs from your database
DO $$
DECLARE
  admin_uid uuid := 'YOUR-ADMIN-USER-ID-HERE';
  teacher_uid uuid := 'YOUR-TEACHER-USER-ID-HERE';
  student_uid uuid := 'YOUR-STUDENT-USER-ID-HERE';
  parent_uid uuid := 'YOUR-PARENT-USER-ID-HERE';

  admin_student_count int;
  teacher_student_count int;
  student_student_count int;
  parent_student_count int;
BEGIN
  -- Test admin access (should see all)
  EXECUTE 'SET LOCAL jwt.claims.sub = $1' USING admin_uid;
  SELECT COUNT(*) INTO admin_student_count FROM students;
  RAISE NOTICE 'Admin can see % students', admin_student_count;

  -- Test teacher access (should see only assigned class students)
  EXECUTE 'SET LOCAL jwt.claims.sub = $1' USING teacher_uid;
  SELECT COUNT(*) INTO teacher_student_count FROM students;
  RAISE NOTICE 'Teacher can see % students', teacher_student_count;

  -- Test student access (should see only 1 - themselves)
  EXECUTE 'SET LOCAL jwt.claims.sub = $1' USING student_uid;
  SELECT COUNT(*) INTO student_student_count FROM students;
  RAISE NOTICE 'Student can see % students (should be 1)', student_student_count;

  -- Test parent access (should see only their children)
  EXECUTE 'SET LOCAL jwt.claims.sub = $1' USING parent_uid;
  SELECT COUNT(*) INTO parent_student_count FROM students;
  RAISE NOTICE 'Parent can see % students (their children)', parent_student_count;

  -- Validate results
  IF student_student_count != 1 THEN
    RAISE EXCEPTION '❌ SECURITY ISSUE: Student can see more than 1 record!';
  END IF;
END $$;
```

---

## 8. ONE-TIME DEPLOYMENT SCRIPT

```sql
-- =====================================================
-- COMPLETE RLS DEPLOYMENT SCRIPT
-- Run this entire script in Supabase SQL Editor
-- =====================================================

-- Begin transaction for safe deployment
BEGIN;

-- Step 1: Create helper functions
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

-- Step 2: Enable RLS on all tables
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN VALUES
    ('users'), ('students'), ('teachers'), ('parents'),
    ('student_parent_relations'), ('teacher_class_assignments'),
    ('classes'), ('student_enrollments'), ('grades'),
    ('attendance'), ('notifications')
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    RAISE NOTICE 'RLS enabled on %', tbl;
  END LOOP;
END $$;

-- Step 3: Apply all policies (copy from sections above)
-- ... [Include all CREATE POLICY statements from above] ...

-- Step 4: Verify
SELECT
  tablename,
  rowsecurity,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = t.tablename) as policy_count
FROM pg_tables t
WHERE schemaname = 'public'
AND tablename IN (
  'users', 'students', 'teachers', 'parents',
  'student_parent_relations', 'teacher_class_assignments',
  'classes', 'student_enrollments', 'grades',
  'attendance', 'notifications'
)
ORDER BY tablename;

-- Commit if everything looks good
COMMIT;
-- ROLLBACK; -- Use this if something went wrong
```

---

## SUMMARY OF ACCESS CONTROLS

```
╔══════════════════════════════════════════════════════════════════════════╗
║                         SECURITY SUMMARY                                 ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  ✅ Default Deny: All tables have RLS enabled by default                ║
║  ✅ Role-Based: All access checks use auth_has_role()                  ║
║  ✅ User Isolation: Non-admins see only their data                      ║
║  ✅ Teacher Filtering: Via teacher_class_assignments junction table     ║
║  ✅ Parent Filtering: Via student_parent_relations junction table       ║
║  ✅ Audit Trail: All changes tracked (optional - add triggers)          ║
║                                                                          ║
║  📋 Key Tables:                                                          ║
║  ├─ users: Role-based profile access                                   ║
║  ├─ students: user_id links to users.id                                ║
║  ├─ teachers: user_id links to users.id                                ║
║  ├─ parents: user_id links to users.id                                 ║
║  ├─ student_parent_relations: Links parents to students                ║
║  ├─ teacher_class_assignments: Links teachers to classes               ║
║  ├─ student_enrollments: Links students to classes                     ║
║  ├─ grades: High security - role/class filtering                       ║
║  ├─ attendance: Role/class filtering                                   ║
║  └─ notifications: User isolation only                                 ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
```
