-- ============================================
-- Fix: Add trigger to automatically create public.users entry
--       when a new auth user is created via Edge Function
-- Date: 2026-05-02
-- ============================================

-- Drop trigger if exists (for re-runnable migration)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger to call handle_new_user() after auth user insertion
-- This ensures public.users entry is created when using Edge Functions
-- or the Supabase Admin API to create users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions to service_role
-- The Edge Function uses service_role to create users
GRANT USAGE ON SCHEMA auth TO service_role;
GRANT ALL ON auth.users TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
