/**
 * Attendance Handler
 *
 * Handles GET_ATTENDANCE action
 * Retrieves student attendance records
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

interface AttendanceInfo {
  student_id: string
  student_name?: string
  date: string
  status: string
  class_name?: string
  subject?: string
}

interface AttendanceStats {
  total: number
  present: number
  absent: number
  late: number
  excused: number
  attendance_rate: number
}

export class AttendanceHandler extends BaseHandler {
  readonly action = Action.GET_ATTENDANCE
  readonly requiredPermissions: Permission[] = [Permission.READ_ATTENDANCE]
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
      console.log(`[AttendanceHandler] Executing for user ${context.userId}`)

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
        console.log(`[AttendanceHandler] Found target student: ${student.name}`)
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
        .from('attendance')
        .select(`
          date,
          status,
          student_id,
          class_id,
          students (
            name
          ),
          classes (
            name,
            subject
          )
        `)
        .order('date', { ascending: false })
        .limit(100)

      if (studentIds.length > 0) {
        query = query.in('student_id', studentIds)
      }

      const { data: attendance, error } = await query

      if (error) {
        throw ErrorService.databaseError(`Failed to fetch attendance: ${error.message}`)
      }

      const attendanceInfo: AttendanceInfo[] = attendance?.map(a => ({
        student_id: a.student_id,
        student_name: a.students?.name,
        date: a.date,
        status: a.status,
        class_name: a.classes?.name,
        subject: a.classes?.subject,
      })) || []

      // Calculate statistics
      const stats = this.calculateStats(attendanceInfo)

      console.log(`[AttendanceHandler] Retrieved ${attendanceInfo.length} attendance records`)

      return this.success({
        records: attendanceInfo,
        statistics: stats
      }, {
        executionTime: Date.now() - startTime,
        dataSource: 'database'
      })

    } catch (error) {
      return this.failure(ErrorService.fromError(error, 'Attendance retrieval failed'))
    }
  }

  /**
   * Calculate attendance statistics
   */
  private calculateStats(records: AttendanceInfo[]): AttendanceStats {
    const stats: AttendanceStats = {
      total: records.length,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      attendance_rate: 0
    }

    for (const record of records) {
      switch (record.status?.toLowerCase()) {
        case 'present':
        case 'presente':
        case 'มา':
          stats.present++
          break
        case 'absent':
        case 'ausente':
        case 'ขาด':
          stats.absent++
          break
        case 'late':
        case 'tarde':
        case 'สาย':
          stats.late++
          break
        case 'excused':
        case 'justificado':
        case 'ลา':
          stats.excused++
          break
      }
    }

    // Calculate attendance rate (present + excused) / total
    if (stats.total > 0) {
      stats.attendance_rate = Math.round(
        ((stats.present + stats.excused) / stats.total) * 100
      )
    }

    return stats
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
