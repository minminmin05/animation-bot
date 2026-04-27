-- ========================================
-- SCHOOL MANAGEMENT SYSTEM - DATABASE SCHEMA
-- ========================================
-- Run this in Supabase SQL Editor to set up your database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- USERS TABLE (extends Supabase Auth)
-- ========================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'parent', 'admin')),
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- STUDENTS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  class TEXT NOT NULL, -- e.g., "10A", "11B"
  grade_level INTEGER, -- e.g., 10, 11, 12
  date_of_birth DATE,
  address TEXT,
  phone TEXT,
  enrollment_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- TEACHERS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS teachers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL, -- e.g., "Mathematics", "Science"
  department TEXT,
  employee_id TEXT UNIQUE,
  phone TEXT,
  qualifications TEXT,
  hire_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- PARENTS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS parents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  occupation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- STUDENT-PARENT RELATIONSHIP
-- ========================================
CREATE TABLE IF NOT EXISTS student_parent_relations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL, -- e.g., "father", "mother", "guardian"
  is_primary_contact BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_id, student_id)
);

-- ========================================
-- CLASSES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL, -- e.g., "10A Mathematics", "11B Science"
  subject TEXT NOT NULL,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  grade_level INTEGER NOT NULL,
  section TEXT, -- e.g., "A", "B"
  academic_year TEXT NOT NULL, -- e.g., "2024-2025"
  room_number TEXT,
  schedule TEXT, -- JSON or text describing schedule
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- STUDENT ENROLLMENT
-- ========================================
CREATE TABLE IF NOT EXISTS student_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  enrollment_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'withdrawn', 'completed')),
  UNIQUE(student_id, class_id, academic_year),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- ASSIGNMENTS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  total_points INTEGER DEFAULT 100,
  assignment_type TEXT DEFAULT 'homework' CHECK (assignment_type IN ('homework', 'quiz', 'exam', 'project')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- GRADES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS grades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id),
  grade NUMERIC(5, 2), -- Grade out of total_points
  term TEXT NOT NULL, -- e.g., "Fall 2024", "Spring 2025"
  comments TEXT,
  graded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- ATTENDANCE TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  marked_by UUID NOT NULL REFERENCES teachers(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, date, class_id)
);

-- ========================================
-- NOTIFICATIONS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class);
CREATE INDEX IF NOT EXISTS idx_teachers_user_id ON teachers(user_id);
CREATE INDEX IF NOT EXISTS idx_parents_user_id ON parents(user_id);
CREATE INDEX IF NOT EXISTS idx_student_parent_student ON student_parent_relations(student_id);
CREATE INDEX IF NOT EXISTS idx_student_parent_parent ON student_parent_relations(parent_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON student_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class ON student_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_assignments_class ON assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_grades_student ON grades(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

-- ========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_parent_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ========================================
-- USERS TABLE POLICIES
-- ========================================
-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Admins can view all users
CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update all users
CREATE POLICY "Admins can update all users"
  ON users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Allow insert during signup (handled by trigger)
CREATE POLICY "Allow user insert during signup"
  ON users FOR INSERT
  WITH CHECK (true);

-- ========================================
-- STUDENTS TABLE POLICIES
-- ========================================
-- Students can view their own data
CREATE POLICY "Students can view own data"
  ON students FOR SELECT
  USING (user_id = auth.uid());

-- Teachers can view students in their classes
CREATE POLICY "Teachers can view their students"
  ON students FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM classes c
      JOIN student_enrollments se ON se.class_id = c.id
      WHERE c.teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
      AND se.student_id = students.id
    )
  );

-- Parents can view their children's data
CREATE POLICY "Parents can view children data"
  ON students FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM student_parent_relations spr
      JOIN parents p ON p.id = spr.parent_id
      WHERE p.user_id = auth.uid() AND spr.student_id = students.id
    )
  );

-- Admins can view all students
CREATE POLICY "Admins can view all students"
  ON students FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ========================================
-- TEACHERS TABLE POLICIES
-- ========================================
-- Teachers can view their own profile
CREATE POLICY "Teachers can view own profile"
  ON teachers FOR SELECT
  USING (user_id = auth.uid());

-- All authenticated users can view teachers (for class info)
CREATE POLICY "Authenticated users can view teachers"
  ON teachers FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ========================================
-- PARENTS TABLE POLICIES
-- ========================================
-- Parents can view their own profile
CREATE POLICY "Parents can view own profile"
  ON parents FOR SELECT
  USING (user_id = auth.uid());

-- Students can view their parents
CREATE POLICY "Students can view own parents"
  ON parents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM student_parent_relations spr
      WHERE spr.parent_id = parents.id
      AND spr.student_id = (SELECT id FROM students WHERE user_id = auth.uid())
    )
  );

-- ========================================
-- CLASSES TABLE POLICIES
-- ========================================
-- Teachers can view their own classes
CREATE POLICY "Teachers can view own classes"
  ON classes FOR SELECT
  USING (teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid()));

-- Students can view their enrolled classes
CREATE POLICY "Students can view enrolled classes"
  ON classes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM student_enrollments se
      JOIN students s ON s.id = se.student_id
      WHERE se.class_id = classes.id AND s.user_id = auth.uid()
    )
  );

-- Parents can view children's classes
CREATE POLICY "Parents can view children classes"
  ON classes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM student_enrollments se
      JOIN student_parent_relations spr ON spr.student_id = se.student_id
      JOIN parents p ON p.id = spr.parent_id
      WHERE se.class_id = classes.id AND p.user_id = auth.uid()
    )
  );

-- Admins can view all classes
CREATE POLICY "Admins can view all classes"
  ON classes FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Teachers can create classes
CREATE POLICY "Teachers can create classes"
  ON classes FOR INSERT
  WITH CHECK (
    teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
  );

-- Teachers can update their classes
CREATE POLICY "Teachers can update own classes"
  ON classes FOR UPDATE
  USING (
    teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
  );

-- ========================================
-- ASSIGNMENTS TABLE POLICIES
-- ========================================
-- Teachers can view assignments for their classes
CREATE POLICY "Teachers can view own assignments"
  ON assignments FOR SELECT
  USING (
    teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
  );

-- Students can view assignments for their classes
CREATE POLICY "Students can view class assignments"
  ON assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM student_enrollments se
      JOIN students s ON s.id = se.student_id
      WHERE se.class_id = assignments.class_id AND s.user_id = auth.uid()
    )
  );

-- Parents can view children's assignments
CREATE POLICY "Parents can view children assignments"
  ON assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM student_enrollments se
      JOIN student_parent_relations spr ON spr.student_id = se.student_id
      JOIN parents p ON p.id = spr.parent_id
      WHERE se.class_id = assignments.class_id AND p.user_id = auth.uid()
    )
  );

-- Teachers can create assignments
CREATE POLICY "Teachers can create assignments"
  ON assignments FOR INSERT
  WITH CHECK (
    teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
  );

-- Teachers can update their assignments
CREATE POLICY "Teachers can update own assignments"
  ON assignments FOR UPDATE
  USING (
    teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
  );

-- ========================================
-- GRADES TABLE POLICIES
-- ========================================
-- Students can view their own grades
CREATE POLICY "Students can view own grades"
  ON grades FOR SELECT
  USING (
    student_id = (SELECT id FROM students WHERE user_id = auth.uid())
  );

-- Parents can view children's grades
CREATE POLICY "Parents can view children grades"
  ON grades FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM student_parent_relations spr
      WHERE spr.student_id = grades.student_id
      AND spr.parent_id = (SELECT id FROM parents WHERE user_id = auth.uid())
    )
  );

-- Teachers can view grades for their classes
CREATE POLICY "Teachers can view class grades"
  ON grades FOR SELECT
  USING (
    teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
  );

-- Teachers can create/update grades for their classes
CREATE POLICY "Teachers can manage grades"
  ON grades FOR ALL
  USING (
    teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
  )
  WITH CHECK (
    teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
  );

-- ========================================
-- ATTENDANCE TABLE POLICIES
-- ========================================
-- Students can view their own attendance
CREATE POLICY "Students can view own attendance"
  ON attendance FOR SELECT
  USING (
    student_id = (SELECT id FROM students WHERE user_id = auth.uid())
  );

-- Parents can view children's attendance
CREATE POLICY "Parents can view children attendance"
  ON attendance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM student_parent_relations spr
      WHERE spr.student_id = attendance.student_id
      AND spr.parent_id = (SELECT id FROM parents WHERE user_id = auth.uid())
    )
  );

-- Teachers can mark attendance for their classes
CREATE POLICY "Teachers can manage attendance"
  ON attendance FOR ALL
  USING (
    marked_by = (SELECT id FROM teachers WHERE user_id = auth.uid())
  )
  WITH CHECK (
    marked_by = (SELECT id FROM teachers WHERE user_id = auth.uid())
  );

-- ========================================
-- NOTIFICATIONS TABLE POLICIES
-- ========================================
-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

-- Users can update their own notifications
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- ========================================
-- FUNCTIONS & TRIGGERS
-- ========================================

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call function on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON teachers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parents_updated_at BEFORE UPDATE ON parents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON classes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- SAMPLE DATA (OPTIONAL - FOR TESTING)
-- ========================================

-- Note: Insert sample data after creating users through auth
-- These are examples - actual user IDs will come from Supabase Auth

-- Example: After creating a user with role 'admin', you can associate additional data
-- INSERT INTO students (user_id, name, class, grade_level) VALUES ('uuid-here', 'John Doe', '10A', 10);

-- ========================================
-- SETUP COMPLETE
-- ========================================
-- Your database is now ready! Remember to:
-- 1. Create your Supabase project
-- 2. Run this SQL in the SQL Editor
-- 3. Set up your environment variables
-- 4. Test the authentication flow
