-- ============================================
-- School Management System - Complete Schema
-- Project: minminmin05's Project
-- Generated: 2026-05-02
-- Fixed: 2026-05-02 (Corrected table order)
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- TABLES (IN CORRECT DEPENDENCY ORDER)
-- ============================================

-- 1. USERS TABLE
-- Core user table that references auth.users
CREATE TABLE public.users (
    id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email text NOT NULL,
    role text NOT NULL CHECK (role IN ('student', 'teacher', 'parent', 'admin')),
    full_name text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (id)
);

-- 2. GRADE LEVELS TABLE
-- Defines grade levels (e.g., Grade 1, Grade 2, etc.)
CREATE TABLE public.grade_levels (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    level integer NOT NULL UNIQUE,
    name text NOT NULL,
    section text,
    min_age integer,
    max_age integer,
    created_at timestamp with time zone DEFAULT now()
);

-- 3. ACADEMIC YEARS TABLE
-- Defines academic years (e.g., 2024-2025, 2025-2026)
CREATE TABLE public.academic_years (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL UNIQUE,
    start_date date NOT NULL,
    end_date date NOT NULL,
    is_current boolean DEFAULT false,
    status text DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'archived')),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT valid_date_range CHECK (end_date > start_date)
);

-- 4. SEMESTERS TABLE
-- Defines semesters within academic years
CREATE TABLE public.semesters (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    academic_year_id uuid NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
    name text NOT NULL,
    sequence integer NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    is_current boolean DEFAULT false,
    status text DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'archived')),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT valid_semester_dates CHECK (end_date > start_date),
    CONSTRAINT unique_semester_name_per_year UNIQUE (academic_year_id, name),
    CONSTRAINT unique_semester_sequence_per_year UNIQUE (academic_year_id, sequence)
);

-- 5. GRADING SCALES TABLE
-- Defines grading scales (e.g., Standard, AP, IB)
CREATE TABLE public.grading_scales (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL UNIQUE,
    description text,
    scale_type text NOT NULL DEFAULT 'percentage',
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

-- 6. GRADE LETTER DEFINITIONS TABLE
-- Defines letter grades (A, B, C, etc.) for each grading scale
CREATE TABLE public.grade_letter_definitions (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    grading_scale_id uuid NOT NULL REFERENCES public.grading_scales(id) ON DELETE CASCADE,
    letter text NOT NULL,
    min_percentage numeric NOT NULL,
    max_percentage numeric NOT NULL,
    gpa_value numeric,
    is_passing boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT grade_letter_definitions_grading_scale_id_letter_key UNIQUE (grading_scale_id, letter)
);

-- 7. CLASS SECTIONS TABLE
-- Defines class sections (e.g., Math 101 - Section A)
CREATE TABLE public.class_sections (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    academic_year_id uuid NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
    semester_id uuid REFERENCES public.semesters(id) ON DELETE SET NULL,
    grade_level_id uuid REFERENCES public.grade_levels(id) ON DELETE SET NULL,
    name text NOT NULL,
    code text NOT NULL,
    section text,
    room_number text,
    schedule jsonb,
    max_students integer DEFAULT 30,
    description text,
    status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT unique_class_section UNIQUE (academic_year_id, semester_id, code, section)
);

-- 8. STUDENTS TABLE
-- Student profile information
CREATE TABLE public.students (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    class text NOT NULL,
    grade_level integer,
    date_of_birth date,
    address text,
    phone text,
    enrollment_date date DEFAULT CURRENT_DATE,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    parent_name text,
    emergency_contact text,
    blood_type text,
    medical_conditions text,
    religion text,
    nationality text
);

-- 9. TEACHERS TABLE
-- Teacher profile information (MUST come before classes!)
CREATE TABLE public.teachers (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    subject text NOT NULL,
    department text,
    employee_id text UNIQUE,
    phone text,
    qualifications text,
    hire_date date DEFAULT CURRENT_DATE,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 10. PARENTS TABLE
-- Parent profile information
CREATE TABLE public.parents (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    phone text,
    address text,
    occupation text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 11. CLASSES TABLE
-- Legacy/Simple class structure (depends on teachers)
CREATE TABLE public.classes (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    subject text NOT NULL,
    teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE RESTRICT,
    grade_level integer NOT NULL,
    section text,
    academic_year text NOT NULL,
    room_number text,
    schedule text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 12. GRADE CATEGORIES TABLE
-- Defines grade categories (e.g., Homework, Tests, Quizzes)
CREATE TABLE public.grade_categories (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    class_section_id uuid REFERENCES public.class_sections(id) ON DELETE CASCADE,
    name text NOT NULL,
    weight numeric NOT NULL DEFAULT 100.00,
    drop_lowest integer DEFAULT 0,
    color text,
    created_at timestamp with time zone DEFAULT now()
);

-- 13. STUDENT PARENT RELATIONS TABLE
-- Links students to their parents/guardians
CREATE TABLE public.student_parent_relations (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    parent_id uuid NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    relationship text NOT NULL,
    is_primary_contact boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT student_parent_relations_parent_id_student_id_key UNIQUE (parent_id, student_id)
);

-- 14. STUDENT ENROLLMENTS TABLE
-- Links students to classes
CREATE TABLE public.student_enrollments (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    enrollment_date date DEFAULT CURRENT_DATE,
    status text DEFAULT 'active' CHECK (status IN ('active', 'withdrawn', 'completed')),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT student_enrollments_student_id_class_id_key UNIQUE (student_id, class_id)
);

-- 15. STUDENT CLASS ENROLLMENTS TABLE
-- Links students to class sections
CREATE TABLE public.student_class_enrollments (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_section_id uuid NOT NULL REFERENCES public.class_sections(id) ON DELETE CASCADE,
    academic_year_id uuid NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
    semester_id uuid REFERENCES public.semesters(id) ON DELETE SET NULL,
    enrollment_date date DEFAULT CURRENT_DATE,
    status text DEFAULT 'active' CHECK (status IN ('active', 'withdrawn', 'completed', 'auditing')),
    final_grade numeric,
    letter_grade text,
    credits_earned numeric DEFAULT 1.00,
    created_at timestamp with time zone DEFAULT now()
);

-- 16. TEACHER CLASS ASSIGNMENTS TABLE
-- Links teachers to class sections
CREATE TABLE public.teacher_class_assignments (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    class_section_id uuid NOT NULL REFERENCES public.class_sections(id) ON DELETE CASCADE,
    teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    role text DEFAULT 'primary' CHECK (role IN ('primary', 'assistant', 'substitute')),
    assigned_date date DEFAULT CURRENT_DATE,
    status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'ended')),
    created_at timestamp with time zone DEFAULT now()
);

-- 17. ASSIGNMENTS TABLE
-- Assignment definitions
CREATE TABLE public.assignments (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    class_section_id uuid NOT NULL REFERENCES public.class_sections(id) ON DELETE CASCADE,
    category_id uuid REFERENCES public.grade_categories(id) ON DELETE SET NULL,
    teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE RESTRICT,
    title text NOT NULL,
    description text,
    max_points numeric NOT NULL DEFAULT 100.00,
    passing_score numeric DEFAULT 60.00,
    assignment_type text DEFAULT 'homework' CHECK (assignment_type IN ('homework', 'quiz', 'test', 'exam', 'project', 'presentation', 'participation')),
    due_date date NOT NULL,
    allow_late_submission boolean DEFAULT true,
    late_penalty_percent numeric DEFAULT 10.00,
    is_published boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 18. STUDENT GRADES TABLE
-- Individual student assignment grades
CREATE TABLE public.student_grades (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_section_id uuid NOT NULL REFERENCES public.class_sections(id) ON DELETE CASCADE,
    academic_year_id uuid NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
    points_earned numeric,
    percentage numeric,
    letter_grade text,
    submitted_at timestamp with time zone,
    is_late boolean DEFAULT false,
    feedback text,
    is_excused boolean DEFAULT false,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'graded', 'excused')),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT student_grades_student_id_assignment_id_key UNIQUE (student_id, assignment_id)
);

-- 19. GRADES TABLE
-- Legacy/simple grades table
CREATE TABLE public.grades (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    assignment_id uuid REFERENCES public.assignments(id) ON DELETE SET NULL,
    class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE RESTRICT,
    grade numeric,
    term text NOT NULL,
    comments text,
    graded_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 20. SEMESTER GRADES TABLE
-- Final semester grades for students
CREATE TABLE public.semester_grades (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_section_id uuid REFERENCES public.class_sections(id) ON DELETE SET NULL,
    academic_year_id uuid NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
    semester_id uuid REFERENCES public.semesters(id) ON DELETE SET NULL,
    final_percentage numeric,
    letter_grade text,
    grade_points numeric,
    credits_earned numeric DEFAULT 1.00,
    teacher_comments text,
    created_at timestamp with time zone DEFAULT now()
);

-- 21. ATTENDANCE TABLE
-- Student attendance records
CREATE TABLE public.attendance (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
    date date NOT NULL,
    status text NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
    marked_by uuid NOT NULL REFERENCES public.teachers(id) ON DELETE RESTRICT,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT attendance_student_id_date_class_id_key UNIQUE (student_id, date, class_id)
);

-- 22. NOTIFICATIONS TABLE
-- User notifications
CREATE TABLE public.notifications (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title text NOT NULL,
    message text NOT NULL,
    type text DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

-- 23. KNOWLEDGE BASE TABLE
-- Knowledge base with vector embeddings for AI search
CREATE TABLE public.knowledge_base (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    category varchar NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    embedding vector(1536),
    metadata jsonb DEFAULT '{}',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 24. STUDENT ACADEMIC RECORDS TABLE
-- Academic records tracking
CREATE TABLE public.student_academic_records (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    academic_year_id uuid NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
    grade_level_id uuid NOT NULL REFERENCES public.grade_levels(id) ON DELETE RESTRICT,
    section text,
    status text DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'promoted', 'retained', 'withdrawn', 'transferred', 'graduated')),
    gpa numeric,
    class_rank integer,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);

-- 25. ASSIGNMENTS_V2 TABLE
-- Alternative assignments structure
CREATE TABLE public.assignments_v2 (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE RESTRICT,
    category_id uuid REFERENCES public.grade_categories(id) ON DELETE SET NULL,
    title text NOT NULL,
    description text,
    max_points numeric NOT NULL DEFAULT 100.00,
    passing_score numeric DEFAULT 60.00,
    assignment_type text DEFAULT 'homework' CHECK (assignment_type IN ('homework', 'quiz', 'test', 'exam', 'project', 'presentation', 'participation')),
    due_date date NOT NULL,
    allow_late_submission boolean DEFAULT true,
    late_penalty_percent numeric DEFAULT 10.00,
    is_published boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================

-- Users indexes
CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON public.users USING btree (email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users USING btree (role);

-- Students indexes
-- Note: students_user_id_key is auto-created by UNIQUE constraint in table definition
CREATE INDEX IF NOT EXISTS idx_students_user_id ON public.students USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_students_class ON public.students USING btree (class);

-- Teachers indexes
-- Note: teachers_user_id_key is auto-created by UNIQUE constraint in table definition
CREATE UNIQUE INDEX IF NOT EXISTS teachers_employee_id_key ON public.teachers USING btree (employee_id);
CREATE INDEX IF NOT EXISTS idx_teachers_user_id ON public.teachers USING btree (user_id);

-- Parents indexes
-- Note: parents_user_id_key is auto-created by UNIQUE constraint in table definition
CREATE INDEX IF NOT EXISTS idx_parents_user_id ON public.parents USING btree (user_id);

-- Student Parent Relations indexes
CREATE INDEX IF NOT EXISTS idx_student_parent_student ON public.student_parent_relations USING btree (student_id);
CREATE INDEX IF NOT EXISTS idx_student_parent_parent ON public.student_parent_relations USING btree (parent_id);

-- Classes indexes
CREATE INDEX IF NOT EXISTS idx_enrollments_class ON public.student_enrollments USING btree (class_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON public.student_enrollments USING btree (student_id);

-- Grades indexes
CREATE INDEX IF NOT EXISTS idx_grades_student ON public.grades USING btree (student_id);

-- Attendance indexes
CREATE INDEX IF NOT EXISTS idx_attendance_student ON public.attendance USING btree (student_id);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications USING btree (user_id);

-- Academic Years indexes
CREATE UNIQUE INDEX IF NOT EXISTS academic_years_name_key ON public.academic_years USING btree (name);
CREATE INDEX IF NOT EXISTS idx_academic_years_dates ON public.academic_years USING btree (start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_academic_years_status ON public.academic_years USING btree (status, is_current);

-- Semesters indexes
CREATE INDEX IF NOT EXISTS idx_semesters_year ON public.semesters USING btree (academic_year_id);

-- Class Sections indexes
CREATE INDEX IF NOT EXISTS idx_class_sections_year ON public.class_sections USING btree (academic_year_id);
CREATE INDEX IF NOT EXISTS idx_class_sections_grade ON public.class_sections USING btree (grade_level_id);

-- Assignments indexes
CREATE INDEX IF NOT EXISTS idx_assignments_class ON public.assignments USING btree (class_section_id);

-- Student Grades indexes
CREATE INDEX IF NOT EXISTS idx_student_grades_student ON public.student_grades USING btree (student_id);

-- Semester Grades indexes
CREATE INDEX IF NOT EXISTS idx_semester_grades_student ON public.semester_grades USING btree (student_id);

-- Grading Scales indexes
CREATE UNIQUE INDEX IF NOT EXISTS grading_scales_name_key ON public.grading_scales USING btree (name);

-- Grade Levels indexes
CREATE UNIQUE INDEX IF NOT EXISTS grade_levels_level_key ON public.grade_levels USING btree (level);

-- Grade Letter Definitions indexes
CREATE UNIQUE INDEX IF NOT EXISTS grade_letter_definitions_grading_scale_id_letter_key ON public.grade_letter_definitions USING btree (grading_scale_id, letter);

-- Knowledge Base indexes
CREATE INDEX IF NOT EXISTS idx_kb_category ON public.knowledge_base USING btree (category);
CREATE INDEX IF NOT EXISTS idx_kb_metadata ON public.knowledge_base USING gin (metadata);
CREATE INDEX IF NOT EXISTS idx_kb_embedding ON public.knowledge_base USING hnsw (embedding vector_cosine_ops);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_parent_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semester_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_class_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_class_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grading_scales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_academic_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments_v2 ENABLE ROW LEVEL SECURITY;

-- Note: The following tables have RLS disabled - consider enabling:
-- ALTER TABLE public.grade_levels ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.grade_letter_definitions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.grade_categories ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

-- USERS POLICIES
CREATE POLICY "users_select_all" ON public.users
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "users_insert_own" ON public.users
    FOR INSERT TO authenticated
    WITH CHECK (id = auth.uid());

CREATE POLICY "users_update_own" ON public.users
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- STUDENTS POLICIES
CREATE POLICY "students_select_all" ON public.students
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "students_insert_all" ON public.students
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "students_update_all" ON public.students
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "students_delete_all" ON public.students
    FOR DELETE TO authenticated
    USING (true);

CREATE POLICY "Students can update own profile" ON public.students
    FOR UPDATE TO public
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- TEACHERS POLICIES
CREATE POLICY "teachers_select_all" ON public.teachers
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "teachers_insert_all" ON public.teachers
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "teachers_update_all" ON public.teachers
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "teachers_delete_all" ON public.teachers
    FOR DELETE TO authenticated
    USING (true);

CREATE POLICY "Teachers can update own profile" ON public.teachers
    FOR UPDATE TO public
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- PARENTS POLICIES
CREATE POLICY "parents_select_all" ON public.parents
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "parents_insert_all" ON public.parents
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "parents_update_all" ON public.parents
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "parents_delete_all" ON public.parents
    FOR DELETE TO authenticated
    USING (true);

CREATE POLICY "Parents can update own profile" ON public.parents
    FOR UPDATE TO public
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- CLASSES POLICIES
CREATE POLICY "classes_admin_read" ON public.classes
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'admin'));

CREATE POLICY "classes_admin_all" ON public.classes
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'admin'));

CREATE POLICY "classes_admin_insert" ON public.classes
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'admin'));

CREATE POLICY "classes_read_own" ON public.classes
    FOR SELECT TO authenticated
    USING (teacher_id = (SELECT id FROM public.teachers WHERE public.teachers.user_id = auth.uid()));

CREATE POLICY "classes_create_own" ON public.classes
    FOR INSERT TO authenticated
    WITH CHECK (teacher_id = (SELECT id FROM public.teachers WHERE public.teachers.user_id = auth.uid()));

CREATE POLICY "classes_update_own" ON public.classes
    FOR UPDATE TO authenticated
    USING (teacher_id = (SELECT id FROM public.teachers WHERE public.teachers.user_id = auth.uid()))
    WITH CHECK (teacher_id = (SELECT id FROM public.teachers WHERE public.teachers.user_id = auth.uid()));

CREATE POLICY "classes_teacher_insert_own" ON public.classes
    FOR INSERT TO authenticated
    WITH CHECK (teacher_id = (SELECT id FROM public.teachers WHERE public.teachers.user_id = auth.uid()));

CREATE POLICY "classes_read_enrolled" ON public.classes
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.student_enrollments se
        JOIN public.students s ON s.id = se.student_id
        WHERE se.class_id = classes.id AND s.user_id = auth.uid()
    ));

CREATE POLICY "classes_read_children" ON public.classes
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.student_enrollments se
        JOIN public.student_parent_relations spr ON spr.student_id = se.student_id
        JOIN public.parents p ON p.id = spr.parent_id
        WHERE se.class_id = classes.id AND p.user_id = auth.uid()
    ));

-- ATTENDANCE POLICIES
CREATE POLICY "attendance_admin_read" ON public.attendance
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'admin'));

CREATE POLICY "attendance_admin_all" ON public.attendance
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'admin'));

CREATE POLICY "attendance_read_own" ON public.attendance
    FOR SELECT TO authenticated
    USING (student_id = (SELECT id FROM public.students WHERE public.students.user_id = auth.uid()));

CREATE POLICY "attendance_read_teachers_classes" ON public.attendance
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.classes c
        WHERE c.id = attendance.class_id AND c.teacher_id = (SELECT id FROM public.teachers WHERE public.teachers.user_id = auth.uid())
    ));

CREATE POLICY "attendance_create_teachers_classes" ON public.attendance
    FOR INSERT TO authenticated
    WITH CHECK (
        marked_by = (SELECT id FROM public.teachers WHERE public.teachers.user_id = auth.uid())
        AND EXISTS (
            SELECT 1 FROM public.classes c
            WHERE c.id = attendance.class_id AND c.teacher_id = (SELECT id FROM public.teachers WHERE public.teachers.user_id = auth.uid())
        )
    );

CREATE POLICY "attendance_update_teachers_classes" ON public.attendance
    FOR UPDATE TO authenticated
    USING (
        marked_by = (SELECT id FROM public.teachers WHERE public.teachers.user_id = auth.uid())
        AND EXISTS (
            SELECT 1 FROM public.classes c
            WHERE c.id = attendance.class_id AND c.teacher_id = (SELECT id FROM public.teachers WHERE public.teachers.user_id = auth.uid())
        )
    )
    WITH CHECK (marked_by = (SELECT id FROM public.teachers WHERE public.teachers.user_id = auth.uid()));

CREATE POLICY "attendance_read_parents" ON public.attendance
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.student_parent_relations spr
        WHERE spr.student_id = attendance.student_id
        AND spr.parent_id = (SELECT id FROM public.parents WHERE public.parents.user_id = auth.uid())
    ));

-- GRADES POLICIES
CREATE POLICY "grades_admin_read" ON public.grades
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'admin'));

CREATE POLICY "grades_admin_all" ON public.grades
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'admin'));

CREATE POLICY "grades_read_own" ON public.grades
    FOR SELECT TO authenticated
    USING (student_id = (SELECT id FROM public.students WHERE public.students.user_id = auth.uid()));

CREATE POLICY "grades_read_teachers_classes" ON public.grades
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.classes c
        WHERE c.id = grades.class_id AND c.teacher_id = (SELECT id FROM public.teachers WHERE public.teachers.user_id = auth.uid())
    ));

CREATE POLICY "grades_create_teachers_classes" ON public.grades
    FOR INSERT TO authenticated
    WITH CHECK (
        teacher_id = (SELECT id FROM public.teachers WHERE public.teachers.user_id = auth.uid())
        AND EXISTS (
            SELECT 1 FROM public.classes c
            WHERE c.id = grades.class_id AND c.teacher_id = (SELECT id FROM public.teachers WHERE public.teachers.user_id = auth.uid())
        )
    );

CREATE POLICY "grades_update_teachers_classes" ON public.grades
    FOR UPDATE TO authenticated
    USING (
        teacher_id = (SELECT id FROM public.teachers WHERE public.teachers.user_id = auth.uid())
        AND EXISTS (
            SELECT 1 FROM public.classes c
            WHERE c.id = grades.class_id AND c.teacher_id = (SELECT id FROM public.teachers WHERE public.teachers.user_id = auth.uid())
        )
    )
    WITH CHECK (teacher_id = (SELECT id FROM public.teachers WHERE public.teachers.user_id = auth.uid()));

CREATE POLICY "grades_read_parents" ON public.grades
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.student_parent_relations spr
        WHERE spr.student_id = grades.student_id
        AND spr.parent_id = (SELECT id FROM public.parents WHERE public.parents.user_id = auth.uid())
    ));

-- NOTIFICATIONS POLICIES
CREATE POLICY "notifications_read_own" ON public.notifications
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "notifications_insert" ON public.notifications
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'admin'));

CREATE POLICY "notifications_update_own" ON public.notifications
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_delete_admin" ON public.notifications
    FOR DELETE TO authenticated
    USING (EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'admin'));

-- STUDENT ENROLLMENTS POLICIES
CREATE POLICY "enrollments_admin_read" ON public.student_enrollments
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'admin'));

CREATE POLICY "enrollments_admin_all" ON public.student_enrollments
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'admin'));

CREATE POLICY "enrollments_read_own" ON public.student_enrollments
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.students
        WHERE public.students.user_id = auth.uid() AND public.students.id = student_enrollments.student_id
    ));

CREATE POLICY "enrollments_read_teachers_classes" ON public.student_enrollments
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.classes c
        WHERE c.id = student_enrollments.class_id AND c.teacher_id = (SELECT id FROM public.teachers WHERE public.teachers.user_id = auth.uid())
    ));

CREATE POLICY "enrollments_read_parents" ON public.student_enrollments
    FOR SELECT TO authenticated
    USING (student_id IN (
        SELECT spr.student_id
        FROM public.student_parent_relations spr
        JOIN public.parents p ON p.id = spr.parent_id
        WHERE p.user_id = auth.uid()
    ));

-- STUDENT PARENT RELATIONS POLICIES
CREATE POLICY "spr_admin_read" ON public.student_parent_relations
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'admin'));

CREATE POLICY "spr_admin_all" ON public.student_parent_relations
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'admin'));

CREATE POLICY "spr_admin_insert" ON public.student_parent_relations
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'admin'));

CREATE POLICY "spr_read_own" ON public.student_parent_relations
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.parents
        WHERE public.parents.user_id = auth.uid() AND public.parents.id = student_parent_relations.parent_id
    ));

CREATE POLICY "spr_read_students_own" ON public.student_parent_relations
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.students
        WHERE public.students.user_id = auth.uid() AND public.students.id = student_parent_relations.student_id
    ));

-- ACADEMIC YEARS POLICIES
CREATE POLICY "All read academic_years" ON public.academic_years
    FOR SELECT TO public
    USING (true);

CREATE POLICY "Admins have full access to academic_years" ON public.academic_years
    FOR ALL TO public
    USING (EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'admin'));

CREATE POLICY "Teachers can read academic_years" ON public.academic_years
    FOR SELECT TO public
    USING (EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'teacher'));

-- SEMESTERS POLICIES
CREATE POLICY "All read semesters" ON public.semesters
    FOR SELECT TO public
    USING (true);

CREATE POLICY "Admins full access semesters" ON public.semesters
    FOR ALL TO public
    USING (EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'admin'));

-- CLASS SECTIONS POLICIES
CREATE POLICY "All read class_sections" ON public.class_sections
    FOR SELECT TO public
    USING (true);

CREATE POLICY "Admins full access class_sections" ON public.class_sections
    FOR ALL TO public
    USING (EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'admin'));

-- GRADING SCALES POLICIES
CREATE POLICY "All read grading_scales" ON public.grading_scales
    FOR SELECT TO public
    USING (true);

-- GRADE LEVELS POLICIES
CREATE POLICY "All read grade_levels" ON public.grade_levels
    FOR SELECT TO public
    USING (true);

-- GRADE CATEGORIES POLICIES
CREATE POLICY "Admins full access grade_categories" ON public.grade_categories
    FOR ALL TO public
    USING (EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'admin'));

-- ASSIGNMENTS POLICIES
CREATE POLICY "Admins full access assignments" ON public.assignments
    FOR ALL TO public
    USING (EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'admin'));

CREATE POLICY "Students read class assignments" ON public.assignments
    FOR SELECT TO public
    USING (EXISTS (
        SELECT 1 FROM public.student_class_enrollments sce
        WHERE sce.class_section_id = assignments.class_section_id
        AND sce.student_id = (SELECT id FROM public.students WHERE public.students.user_id = auth.uid())
        AND sce.status = 'active'
    ));

CREATE POLICY "Teachers read their assignments" ON public.assignments
    FOR SELECT TO public
    USING (EXISTS (
        SELECT 1 FROM public.teacher_class_assignments tca
        WHERE tca.class_section_id = assignments.class_section_id
        AND tca.teacher_id = (SELECT id FROM public.teachers WHERE public.teachers.user_id = auth.uid())
        AND tca.status = 'active'
    ));

-- STUDENT GRADES POLICIES
CREATE POLICY "Admins full access student_grades" ON public.student_grades
    FOR ALL TO public
    USING (EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'admin'));

CREATE POLICY "Students read own grades" ON public.student_grades
    FOR SELECT TO public
    USING (EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.id = student_grades.student_id AND s.user_id = auth.uid()
    ));

CREATE POLICY "Teachers manage student_grades" ON public.student_grades
    FOR ALL TO public
    USING (EXISTS (
        SELECT 1 FROM public.teacher_class_assignments tca
        WHERE tca.class_section_id = student_grades.class_section_id
        AND tca.teacher_id = (SELECT id FROM public.teachers WHERE public.teachers.user_id = auth.uid())
        AND tca.status = 'active'
    ));

-- SEMESTER GRADES POLICIES
CREATE POLICY "Admins full access semester_grades" ON public.semester_grades
    FOR ALL TO public
    USING (EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'admin'));

CREATE POLICY "Students read own semester_grades" ON public.semester_grades
    FOR SELECT TO public
    USING (EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.id = semester_grades.student_id AND s.user_id = auth.uid()
    ));

-- ============================================
-- END OF SCHEMA
-- ============================================
