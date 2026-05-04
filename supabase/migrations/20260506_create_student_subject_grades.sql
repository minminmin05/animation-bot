-- Create a simpler table for entering final grades per student per subject
-- This allows admins to directly enter final grades without going through assignments

CREATE TABLE IF NOT EXISTS public.student_subject_grades (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    academic_year text NOT NULL DEFAULT (EXTRACT(YEAR FROM CURRENT_DATE)::text),
    term text NOT NULL DEFAULT 'Current',
    final_grade numeric,
    letter_grade text,
    grade_points numeric,
    comments text,
    graded_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    graded_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT student_subject_grades_unique UNIQUE (student_id, class_id, academic_year, term)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_student_subject_grades_student ON public.student_subject_grades(student_id);
CREATE INDEX IF NOT EXISTS idx_student_subject_grades_class ON public.student_subject_grades(class_id);

-- Enable RLS
ALTER TABLE public.student_subject_grades ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins full access student_subject_grades" ON public.student_subject_grades
    FOR ALL TO public
    USING (EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'admin'));

CREATE POLICY "Teachers can read student_subject_grades" ON public.student_subject_grades
    FOR SELECT TO public
    USING (EXISTS (
        SELECT 1 FROM public.classes c
        JOIN public.teachers t ON t.id = c.teacher_id
        WHERE c.id = student_subject_grades.class_id AND t.user_id = auth.uid()
    ));

CREATE POLICY "Students can read own student_subject_grades" ON public.student_subject_grades
    FOR SELECT TO public
    USING (EXISTS (
        SELECT 1 FROM public.students s WHERE s.id = student_subject_grades.student_id AND s.user_id = auth.uid()
    ));

-- Function to calculate letter grade and grade points from percentage
CREATE OR REPLACE FUNCTION calculate_grade_info(percentage numeric)
RETURNS TABLE(letter_grade text, grade_points numeric) AS $$
BEGIN
    RETURN QUERY
    SELECT
        CASE
            WHEN percentage >= 90 THEN 'A'
            WHEN percentage >= 85 THEN 'A-'
            WHEN percentage >= 80 THEN 'B+'
            WHEN percentage >= 75 THEN 'B'
            WHEN percentage >= 70 THEN 'B-'
            WHEN percentage >= 65 THEN 'C+'
            WHEN percentage >= 60 THEN 'C'
            WHEN percentage >= 55 THEN 'C-'
            WHEN percentage >= 50 THEN 'D'
            ELSE 'F'
        END as letter_grade,
        CASE
            WHEN percentage >= 90 THEN 4.0
            WHEN percentage >= 85 THEN 3.7
            WHEN percentage >= 80 THEN 3.3
            WHEN percentage >= 75 THEN 3.0
            WHEN percentage >= 70 THEN 2.7
            WHEN percentage >= 65 THEN 2.3
            WHEN percentage >= 60 THEN 2.0
            WHEN percentage >= 55 THEN 1.7
            WHEN percentage >= 50 THEN 1.3
            ELSE 1.0
        END as grade_points;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically calculate letter grade and grade points
CREATE OR REPLACE FUNCTION update_student_subject_grade_info()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.final_grade IS NOT NULL THEN
        SELECT letter_grade, grade_points INTO NEW.letter_grade, NEW.grade_points
        FROM calculate_grade_info(NEW.final_grade);
    END IF;
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER student_subject_grades_before_insert_update
    BEFORE INSERT OR UPDATE ON public.student_subject_grades
    FOR EACH ROW
    EXECUTE FUNCTION update_student_subject_grade_info();
