/**
 * Statistics Handler
 *
 * Handles GET_STATISTICS, GET_STUDENT_COUNT, GET_TEACHER_COUNT, GET_CLASS_COUNT actions
 * Retrieves database statistics and counts
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

interface StatisticsData {
  total_students: number
  total_teachers: number
  total_classes: number
  total_parents: number
  students_by_grade?: Record<string, number>
  students_by_class?: Record<string, number>
}

export class StatisticsHandler extends BaseHandler {
  readonly action = Action.GET_STATISTICS
  readonly requiredPermissions: Permission[] = [Permission.READ_STUDENT_PROFILE]
  readonly requiredEntities: string[] = []

  private supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_KEY || ''
  )

  // This handler can handle multiple count-related actions
  canHandle(context: HandlerContext): boolean {
    return [
      Action.GET_STATISTICS,
      Action.GET_STUDENT_COUNT,
      Action.GET_TEACHER_COUNT,
      Action.GET_CLASS_COUNT
    ].includes(context.action)
  }

  validate(context: HandlerContext): { valid: boolean; errors: string[] } {
    return { valid: true, errors: [] }
  }

  async execute(context: HandlerContext): Promise<HandlerResult> {
    const startTime = Date.now()

    try {
      console.log(`[StatisticsHandler] Executing ${context.action} for user ${context.userId}`)

      switch (context.action) {
        case Action.GET_STUDENT_COUNT:
          return this.getStudentCount(startTime)

        case Action.GET_TEACHER_COUNT:
          return this.getTeacherCount(startTime)

        case Action.GET_CLASS_COUNT:
          return this.getClassCount(startTime)

        case Action.GET_STATISTICS:
        default:
          return this.getAllStatistics(startTime)
      }

    } catch (error) {
      return this.failure(ErrorService.fromError(error, 'Statistics retrieval failed'))
    }
  }

  /**
   * Get total student count
   */
  private async getStudentCount(startTime: number): Promise<HandlerResult> {
    const { count, error } = await this.supabase
      .from('students')
      .select('*', { count: 'exact', head: true })

    if (error) {
      throw ErrorService.databaseError(`Failed to count students: ${error.message}`)
    }

    console.log(`[StatisticsHandler] Student count: ${count}`)

    return this.success({
      count: count || 0,
      entity: 'students'
    }, {
      executionTime: Date.now() - startTime,
      dataSource: 'database'
    })
  }

  /**
   * Get total teacher count
   */
  private async getTeacherCount(startTime: number): Promise<HandlerResult> {
    const { count, error } = await this.supabase
      .from('teachers')
      .select('*', { count: 'exact', head: true })

    if (error) {
      throw ErrorService.databaseError(`Failed to count teachers: ${error.message}`)
    }

    console.log(`[StatisticsHandler] Teacher count: ${count}`)

    return this.success({
      count: count || 0,
      entity: 'teachers'
    }, {
      executionTime: Date.now() - startTime,
      dataSource: 'database'
    })
  }

  /**
   * Get total class count
   */
  private async getClassCount(startTime: number): Promise<HandlerResult> {
    const { count, error } = await this.supabase
      .from('classes')
      .select('*', { count: 'exact', head: true })

    if (error) {
      throw ErrorService.databaseError(`Failed to count classes: ${error.message}`)
    }

    console.log(`[StatisticsHandler] Class count: ${count}`)

    return this.success({
      count: count || 0,
      entity: 'classes'
    }, {
      executionTime: Date.now() - startTime,
      dataSource: 'database'
    })
  }

  /**
   * Get all statistics
   */
  private async getAllStatistics(startTime: number): Promise<HandlerResult> {
    // Execute all count queries in parallel
    const [studentsResult, teachersResult, classesResult, parentsResult] = await Promise.all([
      this.supabase.from('students').select('*', { count: 'exact', head: true }),
      this.supabase.from('teachers').select('*', { count: 'exact', head: true }),
      this.supabase.from('classes').select('*', { count: 'exact', head: true }),
      this.supabase.from('parents').select('*', { count: 'exact', head: true })
    ])

    if (studentsResult.error) {
      throw ErrorService.databaseError(`Failed to count students: ${studentsResult.error.message}`)
    }

    const stats: StatisticsData = {
      total_students: studentsResult.count || 0,
      total_teachers: teachersResult.count || 0,
      total_classes: classesResult.count || 0,
      total_parents: parentsResult.count || 0,
    }

    // Get breakdown by grade level if students exist
    if (stats.total_students > 0) {
      const { data: students } = await this.supabase
        .from('students')
        .select('grade_level, class')
        .not('grade_level', 'is', null)

      if (students) {
        stats.students_by_grade = students.reduce((acc, s) => {
          const grade = s.grade_level?.toString() || 'Unknown'
          acc[grade] = (acc[grade] || 0) + 1
          return acc
        }, {} as Record<string, number>)

        stats.students_by_class = students.reduce((acc, s) => {
          const className = s.class || 'Unassigned'
          acc[className] = (acc[className] || 0) + 1
          return acc
        }, {} as Record<string, number>)
      }
    }

    console.log(`[StatisticsHandler] Statistics:`, stats)

    return this.success(stats, {
      executionTime: Date.now() - startTime,
      dataSource: 'database'
    })
  }
}
