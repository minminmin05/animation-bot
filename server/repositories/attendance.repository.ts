/**
 * Attendance Repository
 *
 * Repository for attendance-related database operations
 */

import { BaseRepository } from '../core/repositories/base.repository.js'
import { ErrorService } from '../core/errors/index.js'

export interface Attendance {
  id: string
  student_id: string
  class_id: string | null
  date: string
  status: 'present' | 'absent' | 'late' | 'excused'
  notes: string | null
  created_at: string
  updated_at: string
}

export interface AttendanceWithDetails extends Attendance {
  students?: {
    id: string
    name: string
  }
  classes?: {
    id: string
    name: string
    subject: string
  }
}

export interface AttendanceSummary {
  present: number
  absent: number
  late: number
  excused: number
  total: number
  attendance_rate: number
}

export class AttendanceRepository extends BaseRepository<Attendance> {
  constructor(supabaseUrl?: string, supabaseKey?: string) {
    super('attendance', supabaseUrl, supabaseKey)
  }

  /**
   * Find attendance for a student
   */
  async findByStudent(
    studentId: string,
    options?: {
      startDate?: string
      endDate?: string
      withDetails?: boolean
      limit?: number
    }
  ): Promise<AttendanceWithDetails[]> {
    try {
      let selectQuery = '*'

      if (options?.withDetails) {
        selectQuery = `
          *,
          students (id, name),
          classes (id, name, subject)
        `
      }

      let query = this.supabase
        .from(this.tableName)
        .select(selectQuery)
        .eq('student_id', studentId)

      if (options?.startDate) {
        query = query.gte('date', options.startDate)
      }
      if (options?.endDate) {
        query = query.lte('date', options.endDate)
      }

      query = query.order('date', { ascending: false })

      if (options?.limit) {
        query = query.limit(options.limit)
      }

      const { data, error } = await query

      if (error) {
        throw ErrorService.databaseError(`Failed to find attendance: ${error.message}`)
      }

      return (data || []) as AttendanceWithDetails[]
    } catch (error) {
      if (error instanceof Error && error.message.includes('database')) throw error
      throw ErrorService.databaseError(`Unexpected error in findByStudent: ${error}`)
    }
  }

  /**
   * Find attendance for a class on a specific date
   */
  async findByClassAndDate(classId: string, date: string): Promise<AttendanceWithDetails[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select(`
          *,
          students (id, name),
          classes (id, name, subject)
        `)
        .eq('class_id', classId)
        .eq('date', date)

      if (error) {
        throw ErrorService.databaseError(`Failed to find class attendance: ${error.message}`)
      }

      return (data || []) as AttendanceWithDetails[]
    } catch (error) {
      if (error instanceof Error && error.message.includes('database')) throw error
      throw ErrorService.databaseError(`Unexpected error in findByClassAndDate: ${error}`)
    }
  }

  /**
   * Get attendance summary for a student
   */
  async getStudentSummary(
    studentId: string,
    options?: { startDate?: string; endDate?: string }
  ): Promise<AttendanceSummary> {
    try {
      let query = this.supabase
        .from(this.tableName)
        .select('status')
        .eq('student_id', studentId)

      if (options?.startDate) {
        query = query.gte('date', options.startDate)
      }
      if (options?.endDate) {
        query = query.lte('date', options.endDate)
      }

      const { data, error } = await query

      if (error) {
        throw ErrorService.databaseError(`Failed to get attendance summary: ${error.message}`)
      }

      const records = data || []
      const summary: AttendanceSummary = {
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        total: records.length,
        attendance_rate: 0
      }

      for (const record of records) {
        switch (record.status) {
          case 'present':
            summary.present++
            break
          case 'absent':
            summary.absent++
            break
          case 'late':
            summary.late++
            break
          case 'excused':
            summary.excused++
            break
        }
      }

      if (summary.total > 0) {
        summary.attendance_rate = Math.round(
          ((summary.present + summary.excused) / summary.total) * 100
        )
      }

      return summary
    } catch (error) {
      if (error instanceof Error && error.message.includes('database')) throw error
      throw ErrorService.databaseError(`Unexpected error in getStudentSummary: ${error}`)
    }
  }

  /**
   * Create attendance record
   */
  async createAttendance(
    studentId: string,
    classId: string,
    date: string,
    status: Attendance['status'],
    notes?: string
  ): Promise<Attendance> {
    return this.create({
      student_id: studentId,
      class_id: classId,
      date,
      status,
      notes: notes || null
    })
  }

  /**
   * Update attendance status
   */
  async updateStatus(attendanceId: string, status: Attendance['status'], notes?: string): Promise<Attendance | null> {
    return this.update(attendanceId, { status, notes: notes || null })
  }

  /**
   * Get attendance by date range
   */
  async findByDateRange(
    startDate: string,
    endDate: string,
    options?: { classId?: string; studentId?: string }
  ): Promise<AttendanceWithDetails[]> {
    try {
      let query = this.supabase
        .from(this.tableName)
        .select(`
          *,
          students (id, name),
          classes (id, name, subject)
        `)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })

      if (options?.classId) {
        query = query.eq('class_id', options.classId)
      }
      if (options?.studentId) {
        query = query.eq('student_id', options.studentId)
      }

      const { data, error } = await query

      if (error) {
        throw ErrorService.databaseError(`Failed to find attendance by date range: ${error.message}`)
      }

      return (data || []) as AttendanceWithDetails[]
    } catch (error) {
      if (error instanceof Error && error.message.includes('database')) throw error
      throw ErrorService.databaseError(`Unexpected error in findByDateRange: ${error}`)
    }
  }
}
