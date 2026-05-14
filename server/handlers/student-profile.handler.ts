/**
 * Student Profile Handler
 *
 * Handles GET_STUDENT_PROFILE action
 * Retrieves general student information
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

interface StudentProfile {
  id: string
  name: string
  class: string
  grade_level: number | null
  date_of_birth: string | null
  address: string | null
  phone: string | null
  enrollment_date: string | null
  parent_name: string | null
  emergency_contact: string | null
  blood_type: string | null
  medical_conditions: string | null
}

export class StudentProfileHandler extends BaseHandler {
  readonly action = Action.GET_STUDENT_PROFILE
  readonly requiredPermissions: Permission[] = [Permission.READ_STUDENT_PROFILE]
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

    // If person name entity is present, validate we can find the student
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
      console.log(`[StudentProfileHandler] Executing for user ${context.userId}`)

      const personName = this.getEntity(context, 'person_name')
      let studentId: string | undefined

      // If admin and person name provided, look up that student
      if (personName && context.userRole === 'admin') {
        const student = await this.findStudentByName(personName)
        if (!student) {
          return this.failure(
            ErrorService.notFound('Student', `Student "${personName}" not found`)
          )
        }
        studentId = student.id
        console.log(`[StudentProfileHandler] Found target student: ${student.name}`)
      } else {
        // Get student ID from user context
        studentId = await this.getStudentId(context.userId!, context.userRole!)
      }

      if (!studentId) {
        return this.failure(
          ErrorService.validationFailed('No student ID found for user')
        )
      }

      // Build query with appropriate access filtering
      let query = this.supabase
        .from('students')
        .select('*')
        .eq('id', studentId)
        .single()

      const { data: student, error } = await query

      if (error) {
        throw ErrorService.databaseError(`Failed to fetch student profile: ${error.message}`)
      }

      if (!student) {
        return this.failure(ErrorService.notFound('Student', 'Student not found'))
      }

      const profile: StudentProfile = {
        id: student.id,
        name: student.name,
        class: student.class || 'Unassigned',
        grade_level: student.grade_level,
        date_of_birth: student.date_of_birth,
        address: student.address,
        phone: student.phone,
        enrollment_date: student.enrollment_date,
        parent_name: student.parent_name,
        emergency_contact: student.emergency_contact,
        blood_type: student.blood_type,
        medical_conditions: student.medical_conditions,
      }

      console.log(`[StudentProfileHandler] Retrieved profile for ${profile.name}`)

      return this.success(profile, {
        executionTime: Date.now() - startTime,
        dataSource: 'database'
      })

    } catch (error) {
      return this.failure(ErrorService.fromError(error, 'Student profile retrieval failed'))
    }
  }

  /**
   * Get student ID from user ID based on role
   */
  private async getStudentId(userId: string, userRole: string): Promise<string | undefined> {
    switch (userRole) {
      case 'student': {
        const { data: student } = await this.supabase
          .from('students')
          .select('id')
          .eq('user_id', userId)
          .single()
        return student?.id
      }
      case 'parent': {
        const { data: parent } = await this.supabase
          .from('parents')
          .select('id')
          .eq('user_id', userId)
          .single()

        if (parent?.id) {
          const { data: relation } = await this.supabase
            .from('student_parent_relations')
            .select('student_id')
            .eq('parent_id', parent.id)
            .single()
          return relation?.student_id
        }
        return undefined
      }
      case 'teacher':
      case 'admin':
        // These roles need to specify which student
        return undefined
      default:
        return undefined
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
