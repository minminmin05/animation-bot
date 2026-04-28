/**
 * Supabase Query Helpers for Student Management
 *
 * Correct join syntax for Supabase foreign key relationships
 */

import { supabase } from '../../config/supabaseClient'

export interface StudentWithUser {
  id: string
  user_id: string
  name: string
  class: string | null
  grade_level: number | null
  phone: string | null
  address: string | null
  date_of_birth: string | null
  enrollment_date: string | null
  created_at: string
  updated_at: string
  // Joined from users table via user_id foreign key
  user: {
    id: string
    email: string
    full_name: string | null
    role: string
  } | null
}

/**
 * Fetch all students with their associated user data
 *
 * IMPORTANT: The join syntax uses the foreign key column name (user_id)
 * followed by the table name in parentheses.
 * Format: foreign_key_column!inner(table_name (columns to select))
 *
 * Options:
 * - !inner = INNER JOIN (only students with matching users)
 * - no ! = LEFT JOIN (all students, user data null if no match)
 */
export async function fetchStudentsWithUsers(): Promise<StudentWithUser[]> {
  const { data, error } = await supabase
    .from('students')
    .select(`
      id,
      user_id,
      name,
      class,
      grade_level,
      phone,
      address,
      date_of_birth,
      enrollment_date,
      created_at,
      updated_at,
      user:users!inner (
        id,
        email,
        full_name,
        role
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Supabase query error:', error)
    throw error
  }

  return (data as StudentWithUser[]) || []
}

/**
 * Fetch a single student by ID with user data
 */
export async function fetchStudentById(studentId: string): Promise<StudentWithUser | null> {
  const { data, error } = await supabase
    .from('students')
    .select(`
      id,
      user_id,
      name,
      class,
      grade_level,
      phone,
      address,
      date_of_birth,
      enrollment_date,
      created_at,
      updated_at,
      user:users!inner (
        id,
        email,
        full_name,
        role
      )
    `)
    .eq('id', studentId)
    .single()

  if (error) {
    console.error('Supabase query error:', error)
    throw error
  }

  return data as StudentWithUser | null
}

/**
 * Search students by name or email
 */
export async function searchStudents(query: string): Promise<StudentWithUser[]> {
  const { data, error } = await supabase
    .from('students')
    .select(`
      id,
      user_id,
      name,
      class,
      grade_level,
      phone,
      enrollment_date,
      created_at,
      user:users!inner (
        id,
        email,
        full_name,
        role
      )
    `)
    .or(`name.ilike.%${query}%,user.email.ilike.%${query}%`)
    .order('name', { ascending: true })

  if (error) {
    console.error('Supabase query error:', error)
    throw error
  }

  return (data as StudentWithUser[]) || []
}

/**
 * Fetch students by class with user data
 */
export async function fetchStudentsByClass(className: string): Promise<StudentWithUser[]> {
  const { data, error } = await supabase
    .from('students')
    .select(`
      id,
      user_id,
      name,
      class,
      grade_level,
      phone,
      enrollment_date,
      created_at,
      user:users!inner (
        id,
        email,
        full_name,
        role
      )
    `)
    .eq('class', className)
    .order('name', { ascending: true })

  if (error) {
    console.error('Supabase query error:', error)
    throw error
  }

  return (data as StudentWithUser[]) || []
}

/**
 * Delete a student by ID
 */
export async function deleteStudent(studentId: string): Promise<void> {
  const { error } = await supabase
    .from('students')
    .delete()
    .eq('id', studentId)

  if (error) {
    console.error('Supabase delete error:', error)
    throw error
  }
}
