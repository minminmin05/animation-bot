/**
 * Schedule/Class Repository
 *
 * Repository for class and schedule-related database operations
 */

import { BaseRepository } from '../core/repositories/base.repository.js'
import { ErrorService } from '../core/errors/index.js'

export interface Class {
  id: string
  name: string
  subject: string
  section: string | null
  grade_level: number | null
  room_number: string | null
  teacher_id: string | null
  schedule: string | null
  day_of_week: string | null
  start_time: string | null
  end_time: string | null
  academic_year: string | null
  term: string | null
  created_at: string
  updated_at: string
}

export interface ClassWithDetails extends Class {
  teachers?: {
    id: string
    name: string
  }
  students?: Array<{
    id: string
    name: string
  }>
}

export interface ScheduleSlot {
  day_of_week: string
  start_time: string
  end_time: string
  class: ClassWithDetails
}

export class ScheduleRepository extends BaseRepository<Class> {
  constructor(supabaseUrl?: string, supabaseKey?: string) {
    super('classes', supabaseUrl, supabaseKey)
  }

  /**
   * Find all classes with teacher details
   */
  async findAllWithTeachers(): Promise<ClassWithDetails[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select(`
          *,
          teachers (id, name)
        `)
        .order('name')

      if (error) {
        throw ErrorService.databaseError(`Failed to find classes: ${error.message}`)
      }

      return (data || []) as ClassWithDetails[]
    } catch (error) {
      if (error instanceof Error && error.message.includes('database')) throw error
      throw ErrorService.databaseError(`Unexpected error in findAllWithTeachers: ${error}`)
    }
  }

  /**
   * Find classes by teacher
   */
  async findByTeacher(teacherId: string): Promise<ClassWithDetails[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select(`
          *,
          teachers (id, name)
        `)
        .eq('teacher_id', teacherId)
        .order('name')

      if (error) {
        throw ErrorService.databaseError(`Failed to find teacher classes: ${error.message}`)
      }

      return (data || []) as ClassWithDetails[]
    } catch (error) {
      if (error instanceof Error && error.message.includes('database')) throw error
      throw ErrorService.databaseError(`Unexpected error in findByTeacher: ${error}`)
    }
  }

  /**
   * Find classes by student (via enrollments)
   */
  async findByStudent(studentId: string): Promise<ClassWithDetails[]> {
    try {
      const { data, error } = await this.supabase
        .from('student_class_enrollments')
        .select(`
          status,
          classes (
            *,
            teachers (id, name)
          )
        `)
        .eq('student_id', studentId)
        .eq('status', 'active')

      if (error) {
        throw ErrorService.databaseError(`Failed to find student classes: ${error.message}`)
      }

      return (data?.map((e: any) => e.classes).filter(Boolean) || []) as ClassWithDetails[]
    } catch (error) {
      if (error instanceof Error && error.message.includes('database')) throw error
      throw ErrorService.databaseError(`Unexpected error in findByStudent: ${error}`)
    }
  }

  /**
   * Find classes by subject
   */
  async findBySubject(subject: string): Promise<ClassWithDetails[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select(`
          *,
          teachers (id, name)
        `)
        .ilike('subject', `%${subject}%`)
        .order('name')

      if (error) {
        throw ErrorService.databaseError(`Failed to find classes by subject: ${error.message}`)
      }

      return (data || []) as ClassWithDetails[]
    } catch (error) {
      if (error instanceof Error && error.message.includes('database')) throw error
      throw ErrorService.databaseError(`Unexpected error in findBySubject: ${error}`)
    }
  }

  /**
   * Find classes by room
   */
  async findByRoom(roomNumber: string): Promise<ClassWithDetails[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select(`
          *,
          teachers (id, name)
        `)
        .eq('room_number', roomNumber)
        .order('name')

      if (error) {
        throw ErrorService.databaseError(`Failed to find classes by room: ${error.message}`)
      }

      return (data || []) as ClassWithDetails[]
    } catch (error) {
      if (error instanceof Error && error.message.includes('database')) throw error
      throw ErrorService.databaseError(`Unexpected error in findByRoom: ${error}`)
    }
  }

  /**
   * Get schedule by day of week
   */
  async getByDayOfWeek(dayOfWeek: string): Promise<ScheduleSlot[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select(`
          *,
          teachers (id, name)
        `)
        .eq('day_of_week', dayOfWeek)
        .order('start_time', { ascending: true })

      if (error) {
        throw ErrorService.databaseError(`Failed to get schedule: ${error.message}`)
      }

      return (data || []).map((c: any) => ({
        day_of_week: c.day_of_week,
        start_time: c.start_time,
        end_time: c.end_time,
        class: c
      }))
    } catch (error) {
      if (error instanceof Error && error.message.includes('database')) throw error
      throw ErrorService.databaseError(`Unexpected error in getByDayOfWeek: ${error}`)
    }
  }

  /**
   * Search classes with filters
   */
  async search(filters: {
    subject?: string
    teacherId?: string
    roomNumber?: string
    gradeLevel?: number
    limit?: number
  }): Promise<ClassWithDetails[]> {
    try {
      let query = this.supabase
        .from(this.tableName)
        .select(`
          *,
          teachers (id, name)
        `)

      if (filters.subject) {
        query = query.ilike('subject', `%${filters.subject}%`)
      }
      if (filters.teacherId) {
        query = query.eq('teacher_id', filters.teacherId)
      }
      if (filters.roomNumber) {
        query = query.eq('room_number', filters.roomNumber)
      }
      if (filters.gradeLevel) {
        query = query.eq('grade_level', filters.gradeLevel)
      }

      query = query.order('name')

      if (filters.limit) {
        query = query.limit(filters.limit)
      }

      const { data, error } = await query

      if (error) {
        throw ErrorService.databaseError(`Failed to search classes: ${error.message}`)
      }

      return (data || []) as ClassWithDetails[]
    } catch (error) {
      if (error instanceof Error && error.message.includes('database')) throw error
      throw ErrorService.databaseError(`Unexpected error in search: ${error}`)
    }
  }
}
