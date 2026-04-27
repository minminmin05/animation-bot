import { createClient } from '@supabase/supabase-js'

// ========================================
// SUPABASE CLIENT CONFIGURATION
// ========================================
// IMPORTANT: These values are loaded from environment variables
// Never hardcode API keys in production!

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file.\n' +
    'Required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ========================================
// DATABASE TABLES REFERENCE
// ========================================
/*
 * users: { id, email, role, created_at }
 * students: { id, user_id, name, class, grade_level }
 * teachers: { id, user_id, name, subject, department }
 * parents: { id, user_id, child_id }
 * grades: { id, student_id, subject, grade, teacher_id, term }
 * assignments: { id, teacher_id, class_id, title, description, due_date }
 * attendance: { id, student_id, date, status, marked_by }
 */
