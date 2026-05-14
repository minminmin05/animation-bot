/**
 * Grade Repository
 *
 * Repository for grade-related database operations
 */

import { BaseRepository } from '../core/repositories/base.repository.js'
import { ErrorService } from '../core/errors/index.js'

export interface StudentSubjectGrade {
  id: string
  student_id: string
  class_id: string | null
  final_grade: number | null
  letter_grade: string | null
  grade_points: number | null
  academic_year: string | null
  term: string | null
  created_at: string
  updated_at: string
}

export interface GradeWithDetails extends StudentSubjectGrade {
  students?: {
    id: string
    name: string
  }
  classes?: {
    id: string
    name: string
    subject: string
    section: string
  }
}

export interface GradeStatistics {
  average: number
  highest: number
  lowest: number
  count: number
  distribution: Record<string, number>
}

export class GradeRepository extends BaseRepository<StudentSubjectGrade> {
  constructor(supabaseUrl?: string, supabaseKey?: string) {
    super('student_subject_grades', supabaseUrl, supabaseKey)
  }

  /**
   * Find grades for a student
   */
  async findByStudent(studentId: string, options?: {
    academicYear?: string
    term?: string
    withDetails?: boolean
  }): Promise<GradeWithDetails[]> {
    try {
      let selectQuery = '*'

      if (options?.withDetails) {
        selectQuery = `
          *,
          students (id, name),
          classes (id, name, subject, section)
        `
      }

      let query = this.supabase
        .from(this.tableName)
        .select(selectQuery)
        .eq('student_id', studentId)

      if (options?.academicYear) {
        query = query.eq('academic_year', options.academicYear)
      }
      if (options?.term) {
        query = query.eq('term', options.term)
      }

      query = query.order('created_at', { ascending: false })

      const { data, error } = await query

      if (error) {
        throw ErrorService.databaseError(`Failed to find grades: ${error.message}`)
      }

      return (data || []) as GradeWithDetails[]
    } catch (error) {
      if (error instanceof Error && error.message.includes('database')) throw error
      throw ErrorService.databaseError(`Unexpected error in findByStudent: ${error}`)
    }
  }

  /**
   * Find grades for a class
   */
  async findByClass(classId: string): Promise<GradeWithDetails[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select(`
          *,
          students (id, name),
          classes (id, name, subject, section)
        `)
        .eq('class_id', classId)
        .not('final_grade', 'is', null)

      if (error) {
        throw ErrorService.databaseError(`Failed to find class grades: ${error.message}`)
      }

      return (data || []) as GradeWithDetails[]
    } catch (error) {
      if (error instanceof Error && error.message.includes('database')) throw error
      throw ErrorService.databaseError(`Unexpected error in findByClass: ${error}`)
    }
  }

  /**
   * Get grade statistics for a student
   */
  async getStudentStatistics(studentId: string): Promise<GradeStatistics> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('final_grade, letter_grade')
        .eq('student_id', studentId)
        .not('final_grade', 'is', null)

      if (error) {
        throw ErrorService.databaseError(`Failed to get grade statistics: ${error.message}`)
      }

      const grades = (data || []).map(g => parseFloat(g.final_grade)).filter(g => !isNaN(g))

      if (grades.length === 0) {
        return {
          average: 0,
          highest: 0,
          lowest: 0,
          count: 0,
          distribution: {}
        }
      }

      const distribution = (data || []).reduce((acc, g: any) => {
        const letter = g.letter_grade || 'N/A'
        acc[letter] = (acc[letter] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      return {
        average: grades.reduce((a, b) => a + b, 0) / grades.length,
        highest: Math.max(...grades),
        lowest: Math.min(...grades),
        count: grades.length,
        distribution
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('database')) throw error
      throw ErrorService.databaseError(`Unexpected error in getStudentStatistics: ${error}`)
    }
  }

  /**
   * Get grade statistics for a class
   */
  async getClassStatistics(classId: string): Promise<GradeStatistics> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('final_grade, letter_grade')
        .eq('class_id', classId)
        .not('final_grade', 'is', null)

      if (error) {
        throw ErrorService.databaseError(`Failed to get class statistics: ${error.message}`)
      }

      const grades = (data || []).map(g => parseFloat(g.final_grade)).filter(g => !isNaN(g))

      if (grades.length === 0) {
        return {
          average: 0,
          highest: 0,
          lowest: 0,
          count: 0,
          distribution: {}
        }
      }

      const distribution = (data || []).reduce((acc, g: any) => {
        const letter = g.letter_grade || 'N/A'
        acc[letter] = (acc[letter] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      return {
        average: grades.reduce((a, b) => a + b, 0) / grades.length,
        highest: Math.max(...grades),
        lowest: Math.min(...grades),
        count: grades.length,
        distribution
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('database')) throw error
      throw ErrorService.databaseError(`Unexpected error in getClassStatistics: ${error}`)
    }
  }

  /**
   * Calculate GPA for a student
   */
  async calculateGPA(studentId: string): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('grade_points')
        .eq('student_id', studentId)
        .not('grade_points', 'is', null)

      if (error) {
        throw ErrorService.databaseError(`Failed to calculate GPA: ${error.message}`)
      }

      const gradePoints = (data || [])
        .map(g => parseFloat(g.grade_points))
        .filter(g => !isNaN(g))

      if (gradePoints.length === 0) return 0

      return gradePoints.reduce((a, b) => a + b, 0) / gradePoints.length
    } catch (error) {
      if (error instanceof Error && error.message.includes('database')) throw error
      throw ErrorService.databaseError(`Unexpected error in calculateGPA: ${error}`)
    }
  }
}
