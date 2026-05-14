-- Add credits column to classes table
ALTER TABLE public.classes
ADD COLUMN credits numeric DEFAULT 1.00 CHECK (credits > 0);

-- Add comment
COMMENT ON COLUMN public.classes.credits IS 'Number of credits for this course';
