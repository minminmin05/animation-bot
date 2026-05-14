/**
 * Department Service
 *
 * Handles all department-related operations including:
 * - Department CRUD operations
 * - Getting departments with teacher counts
 * - Managing teacher-department relationships
 */

import { supabase } from '../../config/supabaseClient'

// ========================================
// TYPES
// ========================================

export interface Department {
  id: string
  name: string
  created_at: string
}

export interface DepartmentWithCount extends Department {
  teacher_count: number
}

export interface DepartmentWithTeachers extends Department {
  teachers: Array<{
    id: string
    name: string
    subject: string
    email: string
  }>
}

// ========================================
// DEPARTMENT SERVICE
// ========================================

class DepartmentService {
  /**
   * Get all departments with teacher count
   */
  async getDepartmentsWithCount(): Promise<DepartmentWithCount[]> {
    // First fetch all departments
    const { data: departments, error: deptError } = await supabase
      .from('departments')
      .select('*')
      .order('name')

    if (deptError) throw deptError

    // Then fetch teacher counts for each department
    const deptIds = (departments || []).map((d: Department) => d.id)
    const { data: teachers, error: teachersError } = await supabase
      .from('teachers')
      .select('department_id')
      .in('department_id', deptIds)

    if (teachersError) throw teachersError

    // Count teachers per department
    const teacherCounts: Record<string, number> = {}
    for (const teacher of (teachers || [])) {
      const deptId = teacher.department_id
      if (deptId) {
        teacherCounts[deptId] = (teacherCounts[deptId] || 0) + 1
      }
    }

    // Combine results
    return (departments || []).map((dept: Department) => ({
      ...dept,
      teacher_count: teacherCounts[dept.id] || 0
    })) as DepartmentWithCount[]
  }

  /**
   * Get all departments (simple list)
   */
  async getDepartments(): Promise<Department[]> {
    console.log('[DEPT SERVICE] Fetching departments...')
    console.log('[DEPT SERVICE] supabase instance:', supabase)

    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession()
    console.log('[DEPT SERVICE] Current session:', session ? 'Authenticated' : 'Not authenticated')
    console.log('[DEPT SERVICE] User:', session?.user?.id)

    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .order('name')

    console.log('[DEPT SERVICE] Query result - data:', data)
    console.log('[DEPT SERVICE] Query result - error:', error)

    if (error) {
      console.error('[DEPT SERVICE] Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
      throw error
    }
    return (data || []) as Department[]
  }

  /**
   * Get a single department by ID with teacher details
   */
  async getDepartmentWithTeachers(departmentId: string): Promise<DepartmentWithTeachers | null> {
    const { data, error } = await supabase
      .rpc('get_department_with_teachers', { dept_id: departmentId })

    if (error) throw error
    if (!data || data.length === 0) return null
    return data[0] as DepartmentWithTeachers
  }

  /**
   * Get a single department by ID
   */
  async getDepartment(departmentId: string): Promise<Department | null> {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .eq('id', departmentId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw error
    }
    return data as Department
  }

  /**
   * Create a new department
   */
  async createDepartment(name: string): Promise<Department> {
    // Validate input
    if (!name || name.trim().length === 0) {
      throw new Error('Department name is required')
    }

    const trimmedName = name.trim()

    // Check for duplicate
    const { data: existing } = await supabase
      .from('departments')
      .select('id')
      .eq('name', trimmedName)
      .single()

    if (existing) {
      throw new Error(`Department "${trimmedName}" already exists`)
    }

    const { data, error } = await supabase
      .from('departments')
      .insert({ name: trimmedName })
      .select()
      .single()

    if (error) throw error
    return data as Department
  }

  /**
   * Update a department
   */
  async updateDepartment(departmentId: string, name: string): Promise<Department> {
    // Validate input
    if (!name || name.trim().length === 0) {
      throw new Error('Department name is required')
    }

    const trimmedName = name.trim()

    // Check for duplicate (excluding current department)
    const { data: existing } = await supabase
      .from('departments')
      .select('id')
      .eq('name', trimmedName)
      .neq('id', departmentId)
      .single()

    if (existing) {
      throw new Error(`Department "${trimmedName}" already exists`)
    }

    const { data, error } = await supabase
      .from('departments')
      .update({ name: trimmedName })
      .eq('id', departmentId)
      .select()
      .single()

    if (error) throw error
    return data as Department
  }

  /**
   * Delete a department
   * Returns: { success: boolean, teachersAffected: number }
   */
  async deleteDepartment(departmentId: string): Promise<{ success: boolean; teachersAffected: number }> {
    // First check how many teachers are affected
    const { data: teachers, error: countError } = await supabase
      .from('teachers')
      .select('id', { count: 'exact', head: true })
      .eq('department_id', departmentId)

    if (countError) throw countError

    const teacherCount = teachers?.length || 0

    // Delete the department (ON DELETE SET NULL will handle teachers)
    const { error } = await supabase
      .from('departments')
      .delete()
      .eq('id', departmentId)

    if (error) throw error

    return {
      success: true,
      teachersAffected: teacherCount
    }
  }

  /**
   * Assign a teacher to a department
   */
  async assignTeacherToDepartment(teacherId: string, departmentId: string | null): Promise<void> {
    const { error } = await supabase
      .from('teachers')
      .update({
        department_id: departmentId,
        // Keep the legacy department field in sync for backward compatibility
        department: departmentId ? null : 'Unassigned'
      })
      .eq('id', teacherId)

    if (error) throw error
  }

  /**
   * Get teachers by department
   */
  async getTeachersByDepartment(departmentId: string): Promise<Array<any>> {
    const { data, error } = await supabase
      .from('teachers')
      .select(`
        id,
        name,
        subject,
        employee_id,
        user_id,
        users!inner (
          email
        )
      `)
      .eq('department_id', departmentId)
      .order('name')

    if (error) throw error

    // Flatten the nested users object to get email at top level
    return (data || []).map((teacher: any) => ({
      id: teacher.id,
      name: teacher.name,
      subject: teacher.subject,
      email: teacher.users?.email || 'No email'
    }))
  }
}

// Export singleton instance
export default new DepartmentService()
