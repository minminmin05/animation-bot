/**
 * Schedule Handler
 *
 * Handles GET_SCHEDULE action
 * Retrieves class schedule/timetable
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

interface ScheduleInfo {
  subject: string
  class_name: string
  section?: string
  room_number?: string
  teacher_name?: string
  schedule?: string
  day_of_week?: string
  start_time?: string
  end_time?: string
}

export class ScheduleHandler extends BaseHandler {
  readonly action = Action.GET_SCHEDULE
  readonly requiredPermissions: Permission[] = [Permission.READ_SCHEDULE]
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
      console.log(`[ScheduleHandler] Executing for user ${context.userId}`)

      // Check for subject entity filter
      const subject = this.getEntity(context, 'subject')
      const room = this.getEntity(context, 'room_number')

      // For schedule queries, we primarily query the classes table
      // as it contains schedule information
      let query = this.supabase
        .from('classes')
        .select(`
          id,
          name,
          subject,
          section,
          room_number,
          schedule,
          day_of_week,
          start_time,
          end_time,
          teachers (
            name
          )
        `)
        .order('name')
        .limit(50)

      // Apply subject filter if specified
      if (subject) {
        query = query.ilike('subject', `%${subject}%`)
      }

      // Apply room filter if specified
      if (room) {
        query = query.ilike('room_number', `%${room}%`)
      }

      const { data: classes, error } = await query

      if (error) {
        throw ErrorService.databaseError(`Failed to fetch schedule: ${error.message}`)
      }

      const scheduleInfo: ScheduleInfo[] = classes?.map(c => ({
        subject: c.subject || 'Unknown',
        class_name: c.name || 'Unknown',
        section: c.section,
        room_number: c.room_number,
        teacher_name: c.teachers?.name,
        schedule: c.schedule,
        day_of_week: c.day_of_week,
        start_time: c.start_time,
        end_time: c.end_time,
      })) || []

      console.log(`[ScheduleHandler] Retrieved ${scheduleInfo.length} class schedules`)

      return this.success(scheduleInfo, {
        executionTime: Date.now() - startTime,
        dataSource: 'database'
      })

    } catch (error) {
      return this.failure(ErrorService.fromError(error, 'Schedule retrieval failed'))
    }
  }
}
