/**
 * Student Repository
 *
 * Repository for student-related database operations
 */

import { BaseRepository } from '../core/repositories/base.repository.js'
import { ErrorService } from '../core/errors/index.js'
import { QueryFilter } from '../core/repositories/repository.interface.js'

export interface Student {
  id: string
  user_id: string | null
  name: string
  class: string | null
  grade_level: number | null
  date_of_birth: string | null
  address: string | null
  phone: string | null
  enrollment_date: string | null
  parent_name: string | null
  emergency_contact: string | null
  blood_type: string | null
  medical_conditions: string | null
  created_at: string
  updated_at: string
}

export interface StudentWithRelations extends Student {
  user?: {
    id: string
    email: string
  }
  enrollments?: Array<{
    id: string
    class_id: string
    status: string
  }>
  classes?: Array<{
    id: string
    name: string
    subject: string
  }>
}

export class StudentRepository extends BaseRepository<Student> {
  constructor(supabaseUrl?: string, supabaseKey?: string) {
    super('students', supabaseUrl, supabaseKey)
  }

  /**
   * Find a student by user ID
   */
  async findByUserId(userId: string): Promise<Student | null> {
    return this.findOne({ where: { user_id: userId } })
  }

  /**
   * Find students by name (partial match)
   */
  async findByName(namePattern: string, limit = 10): Promise<Student[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select()
        .ilike('name', `%${namePattern}%`)
        .limit(limit)

      if (error) {
        throw ErrorService.databaseError(`Failed to find students by name: ${error.message}`)
      }

      return (data || []) as Student[]
    } catch (error) {
      if (error instanceof Error && error.message.includes('database')) throw error
      throw ErrorService.databaseError(`Unexpected error in findByName: ${error}`)
    }
  }

  /**
   * Find students by class
   */
  async findByClass(className: string): Promise<Student[]> {
    return this.findMany({ where: { class: className } })
  }

  /**
   * Find students by grade level
   */
  async findByGradeLevel(gradeLevel: number): Promise<Student[]> {
    return this.findMany({ where: { grade_level: gradeLevel } })
  }

  /**
   * Find student with relations (user, enrollments, classes)
   */
  async findWithRelations(
    studentId: string,
    relations: string[] = ['user', 'enrollments', 'classes']
  ): Promise<StudentWithRelations | null> {
    try {
      // Build select query based on requested relations
      let selectColumns = '*'

      if (relations.includes('user')) {
        selectColumns += ', user!inner(id, email)'
      }
      if (relations.includes('enrollments')) {
        selectColumns += ', student_class_enrollments(id, class_id, status)'
      }
      if (relations.includes('classes')) {
        selectColumns += ', student_class_enrollments(class_id, classes(id, name, subject))'
      }

      const { data, error } = await this.supabase
        .from(this.tableName)
        .select(selectColumns)
        .eq('id', studentId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null
        throw ErrorService.databaseError(`Failed to find student with relations: ${error.message}`)
      }

      return data as StudentWithRelations
    } catch (error) {
      if (error instanceof Error && error.message.includes('database')) throw error
      throw ErrorService.databaseError(`Unexpected error in findWithRelations: ${error}`)
    }
  }

  /**
   * Get student count by grade level
   */
  async getCountByGradeLevel(): Promise<Record<string, number>> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('grade_level')

      if (error) {
        throw ErrorService.databaseError(`Failed to count by grade: ${error.message}`)
      }

      return (data || []).reduce((acc, s: any) => {
        const grade = s.grade_level?.toString() || 'Unknown'
        acc[grade] = (acc[grade] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    } catch (error) {
      if (error instanceof Error && error.message.includes('database')) throw error
      throw ErrorService.databaseError(`Unexpected error in getCountByGradeLevel: ${error}`)
    }
  }

  /**
   * Get student count by class
   */
  async getCountByClass(): Promise<Record<string, number>> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('class')

      if (error) {
        throw ErrorService.databaseError(`Failed to count by class: ${error.message}`)
      }

      return (data || []).reduce((acc, s: any) => {
        const className = s.class || 'Unassigned'
        acc[className] = (acc[className] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    } catch (error) {
      if (error instanceof Error && error.message.includes('database')) throw error
      throw ErrorService.databaseError(`Unexpected error in getCountByClass: ${error}`)
    }
  }

  /**
   * Search students with filters
   */
  async search(filters: {
    name?: string
    class?: string
    gradeLevel?: number
    limit?: number
    offset?: number
  }): Promise<{ students: Student[]; total: number }> {
    try {
      let query = this.supabase
        .from(this.tableName)
        .select('*', { count: 'exact' })

      if (filters.name) {
        query = query.ilike('name', `%${filters.name}%`)
      }
      if (filters.class) {
        query = query.eq('class', filters.class)
      }
      if (filters.gradeLevel) {
        query = query.eq('grade_level', filters.gradeLevel)
      }

      const limit = filters.limit || 20
      const offset = filters.offset || 0

      query = query.range(offset, offset + limit - 1)

      const { data, error, count } = await query

      if (error) {
        throw ErrorService.databaseError(`Failed to search students: ${error.message}`)
      }

      return {
        students: (data || []) as Student[],
        total: count || 0
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('database')) throw error
      throw ErrorService.databaseError(`Unexpected error in search: ${error}`)
    }
  }
}
