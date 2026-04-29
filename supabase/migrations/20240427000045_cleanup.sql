-- ========================================
-- CLEANUP - Drop all new tables first
-- Run this to reset everything before running 00044
-- ========================================

-- Drop all tables in reverse order of dependencies
DROP TABLE IF EXISTS student_grades CASCADE;
DROP TABLE IF EXISTS assignments CASCADE;
DROP TABLE IF EXISTS semester_grades CASCADE;
DROP TABLE IF EXISTS grade_categories CASCADE;
DROP TABLE IF EXISTS grade_letter_definitions CASCADE;
DROP TABLE IF EXISTS grading_scales CASCADE;

DROP TABLE IF EXISTS student_class_enrollments CASCADE;
DROP TABLE IF EXISTS student_academic_records CASCADE;
DROP TABLE IF EXISTS teacher_class_assignments CASCADE;
DROP TABLE IF EXISTS class_sections CASCADE;
DROP TABLE IF EXISTS semesters CASCADE;
DROP TABLE IF EXISTS grade_levels CASCADE;

-- Keep academic_years - it was created in 00043
-- Just update it if needed
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'academic_years' AND column_name = 'status') THEN
    ALTER TABLE academic_years ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('upcoming', 'active', 'completed', 'archived'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'valid_date_range'
    AND conrelid = 'academic_years'::regclass
  ) THEN
    ALTER TABLE academic_years ADD CONSTRAINT valid_date_range CHECK (end_date > start_date);
  END IF;
END $$;

SELECT 'Cleanup completed. Now run migration 00044.' as result;
