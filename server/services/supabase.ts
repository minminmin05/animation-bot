import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error(
    'Missing Supabase credentials. Please ensure SUPABASE_URL and SUPABASE_SERVICE_KEY are set in server/.env file.'
  )
}

// Use service_role key so server-side operations bypass RLS
export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
