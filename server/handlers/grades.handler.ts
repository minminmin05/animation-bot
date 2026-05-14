/**
 * Grades Handler
 *
 * Handles GET_GRADES action
 * Retrieves student grades, scores, and GPA
 */

import {
  BaseHandler,
  HandlerContext,
  HandlerResult,
  Action,
  Permission
} from '../core/handlers/handler.interface.js'
import { ErrorService } from '../core/errors/index.js'
import { createClient } from '@supabase/supabase-js'

interface GradeInfo {
  student_id: string
  student_name: string
  subject: string
  class_name: string
  score: number
  grade: string
  grade_points: number | null
  academic_year: string | null
  term: string | null
}

export class GradesHandler extends BaseHandler {
  readonly action = Action.GET_GRADES
  readonly requiredPermissions: Permission[] = [Permission.READ_GRADES]
  readonly requiredEntities: string[] = []

  private supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_KEY || ''
  )

  canHandle(context: HandlerContext): boolean {
    return context.action === this.action
  }

  validate(context: HandlerContext): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    const personName = this.getEntity(context, 'person_name')
    if (personName && context.userRole !== 'admin') {
      errors.push('Only admins can query other students by name')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  async execute(context: HandlerContext): Promise<HandlerResult> {
    const startTime = Date.now()

    try {
      console.log(`[GradesHandler] Executing for user ${context.userId}`)

      const personName = this.getEntity(context, 'person_name')
      let studentIds: string[] = []

      // Determine which students to query based on role
      if (personName && context.userRole === 'admin') {
        const student = await this.findStudentByName(personName)
        if (!student) {
          return this.failure(
            ErrorService.notFound('Student', `Student "${personName}" not found`)
          )
        }
        studentIds = [student.id]
        console.log(`[GradesHandler] Found target student: ${student.name}`)
      } else {
        studentIds = await this.getAccessibleStudentIds(context.userId!, context.userRole!)
      }

      if (studentIds.length === 0) {
        return this.failure(
          ErrorService.validationFailed('No accessible students found')
        )
      }

      // Build query with proper joins
      let query = this.supabase
        .from('student_subject_grades')
        .select(`
          student_id,
          final_grade,
          letter_grade,
          grade_points,
          class_id,
          academic_year,
          term,
          students (
            name
          ),
          classes (
            name,
            subject,
            section
          )
        `)
        .not('final_grade', 'is', null)
        .order('created_at', { ascending: false })
        .limit(100)

      if (studentIds.length > 0) {
        query = query.in('student_id', studentIds)
      }

      const { data: grades, error } = await query

      if (error) {
        throw ErrorService.databaseError(`Failed to fetch grades: ${error.message}`)
      }

      const gradeInfo: GradeInfo[] = grades?.map(g => ({
        student_id: g.student_id,
        student_name: g.students?.name || 'Unknown',
        subject: g.classes?.subject || g.classes?.name || 'Unknown',
        class_name: g.classes?.name || 'N/A',
        score: parseFloat(g.final_grade) || 0,
        grade: g.letter_grade || 'N/A',
        grade_points: g.grade_points,
        academic_year: g.academic_year,
        term: g.term,
      })) || []

      console.log(`[GradesHandler] Retrieved ${gradeInfo.length} grade records`)

      return this.success(gradeInfo, {
        executionTime: Date.now() - startTime,
        dataSource: 'database'
      })

    } catch (error) {
      return this.failure(ErrorService.fromError(error, 'Grades retrieval failed'))
    }
  }

  /**
   * Get accessible student IDs based on user role
   */
  private async getAccessibleStudentIds(userId: string, userRole: string): Promise<string[]> {
    switch (userRole) {
      case 'student': {
        const { data: student } = await this.supabase
          .from('students')
          .select('id')
          .eq('user_id', userId)
          .single()
        return student?.id ? [student.id] : []
      }
      case 'parent': {
        const { data: parent } = await this.supabase
          .from('parents')
          .select('id')
          .eq('user_id', userId)
          .single()

        if (parent?.id) {
          const { data: relations } = await this.supabase
            .from('student_parent_relations')
            .select('student_id')
            .eq('parent_id', parent.id)
          return relations?.map(r => r.student_id) || []
        }
        return []
      }
      case 'teacher': {
        const { data: teacher } = await this.supabase
          .from('teachers')
          .select('id')
          .eq('user_id', userId)
          .single()

        if (teacher?.id) {
          const { data: classes } = await this.supabase
            .from('classes')
            .select('id')
            .eq('teacher_id', teacher.id)

          if (classes && classes.length > 0) {
            const classIds = classes.map(c => c.id)
            const { data: enrollments } = await this.supabase
              .from('student_class_enrollments')
              .select('student_id')
              .in('class_id', classIds)
            return enrollments?.map(e => e.student_id) || []
          }
        }
        return []
      }
      case 'admin':
        // Admins must specify a student or can query all (handled elsewhere)
        return []
      default:
        return []
    }
  }

  /**
   * Find a student by name (admin only)
   */
  private async findStudentByName(
    studentName: string
  ): Promise<{ id: string; name: string } | null> {
    const { data: students } = await this.supabase
      .from('students')
      .select('id, name')
      .ilike('name', `%${studentName}%`)
      .limit(1)

    if (!students || students.length === 0) {
      return null
    }

    return students[0]
  }
}
