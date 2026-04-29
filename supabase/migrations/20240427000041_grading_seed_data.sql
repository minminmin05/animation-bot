-- ========================================
-- GRADING SYSTEM SEED DATA
-- ========================================
-- Migration: 20240427000041_grading_seed_data
-- Description: Default grading scales and letter grades

-- Insert default 4.0 GPA scale
INSERT INTO grading_scales (name, description, scale_type, is_default, min_gpa, max_gpa)
VALUES
  ('Standard 4.0', 'Standard US 4.0 GPA scale', 'gpa', true, 0.00, 4.00),
  ('Thai 10-Point', 'Thai educational system 10-point scale', 'points', false, 0, 10)
ON CONFLICT (name) DO NOTHING;

-- Insert letter grades for 4.0 scale
INSERT INTO grade_letter_definitions (grading_scale_id, letter, name, min_percentage, max_percentage, gpa_value, grade_points, is_passing)
SELECT
  gs.id,
  g.letter,
  g.name,
  g.min_pct,
  g.max_pct,
  g.gpa_val,
  g.gp_val,
  g.passing
FROM grading_scales gs
CROSS JOIN (VALUES
  ('A+', 'Excellent', 97.00, 100.00, 4.00, 4.30, true),
  ('A', 'Very Good', 93.00, 96.99, 4.00, 4.00, true),
  ('A-', 'Good', 90.00, 92.99, 3.70, 3.70, true),
  ('B+', 'Good', 87.00, 89.99, 3.30, 3.30, true),
  ('B', 'Satisfactory', 83.00, 86.99, 3.00, 3.00, true),
  ('B-', 'Satisfactory', 80.00, 82.99, 2.70, 2.70, true),
  ('C+', 'Fair', 77.00, 79.99, 2.30, 2.30, true),
  ('C', 'Fair', 73.00, 76.99, 2.00, 2.00, true),
  ('C-', 'Passing', 70.00, 72.99, 1.70, 1.70, true),
  ('D+', 'Poor', 67.00, 69.99, 1.30, 1.30, true),
  ('D', 'Poor', 63.00, 66.99, 1.00, 1.00, true),
  ('D-', 'Barely Passing', 60.00, 62.99, 0.70, 0.70, true),
  ('F', 'Fail', 0.00, 59.99, 0.00, 0.00, false)
) AS g(letter, name, min_pct, max_pct, gpa_val, gp_val, passing)
WHERE gs.name = 'Standard 4.0'
ON CONFLICT (grading_scale_id, letter) DO NOTHING;

-- Insert letter grades for Thai 10-point scale
INSERT INTO grade_letter_definitions (grading_scale_id, letter, name, min_percentage, max_percentage, gpa_value, grade_points, is_passing)
SELECT
  gs.id,
  g.letter,
  g.name,
  g.min_pct,
  g.max_pct,
  g.gpa_val,
  g.gp_val,
  g.passing
FROM grading_scales gs
CROSS JOIN (VALUES
  ('4', 'Excellent', 80.00, 100.00, 4.00, 4.00, true),
  ('3.5', 'Very Good', 75.00, 79.99, 3.50, 3.50, true),
  ('3', 'Good', 70.00, 74.99, 3.00, 3.00, true),
  ('2.5', 'Fair', 65.00, 69.99, 2.50, 2.50, true),
  ('2', 'Satisfactory', 60.00, 64.99, 2.00, 2.00, true),
  ('1.5', 'Poor', 55.00, 59.99, 1.50, 1.50, true),
  ('1', 'Barely Passing', 50.00, 54.99, 1.00, 1.00, true),
  ('0', 'Fail', 0.00, 49.99, 0.00, 0.00, false)
) AS g(letter, name, min_pct, max_pct, gpa_val, gp_val, passing)
WHERE gs.name = 'Thai 10-Point'
ON CONFLICT (grading_scale_id, letter) DO NOTHING;
