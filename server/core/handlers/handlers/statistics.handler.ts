/**
 * Statistics Handler
 *
 * Handles requests for counts and statistics.
 */

import {
  BaseHandler,
  HandlerContext,
  HandlerResult,
  Action
} from '../handler.interface.js'
import { Permission } from '../handler.interface.js'
import { ErrorService } from '../../errors/index.js'
import { getSupabase } from '../../repositories/index.js'

/**
 * Statistics handler for counts and statistics
 */
export class StatisticsHandler extends BaseHandler {
  readonly action = Action.GET_STATISTICS
  readonly requiredPermissions: Permission[] = [] // Anyone can ask for stats

  canHandle(context: HandlerContext): boolean {
    return context.action === Action.GET_STATISTICS
  }

  validate(context: HandlerContext): { valid: boolean; errors: string[] } {
    return { valid: true, errors: [] } // Always valid
  }

  async execute(context: HandlerContext): Promise<HandlerResult> {
    const startTime = Date.now()
    const supabase = getSupabase()

    try {
      const stats: Record<string, number> = {}
      const normalized = context.normalizedQuery.toLowerCase()

      // Check what statistics are requested
      if (/นักเรียน|student/.test(normalized)) {
        const { count } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
        stats['นักเรียนทั้งหมด'] = count || 0
      }

      if (/ครู|teacher/.test(normalized)) {
        const { count } = await supabase
          .from('teachers')
          .select('*', { count: 'exact', head: true })
        stats['ครูทั้งหมด'] = count || 0
      }

      if (/ห้อง|class/.test(normalized)) {
        const { count } = await supabase
          .from('classes')
          .select('*', { count: 'exact', head: true })
        stats['ห้องเรียนทั้งหมด'] = count || 0
      }

      // If no specific entity, get all counts
      if (Object.keys(stats).length === 0) {
        const [studentCount, teacherCount, classCount] = await Promise.all([
          supabase.from('students').select('*', { count: 'exact', head: true }),
          supabase.from('teachers').select('*', { count: 'exact', head: true }),
          supabase.from('classes').select('*', { count: 'exact', head: true })
        ])

        stats['นักเรียน'] = studentCount.count || 0
        stats['ครู'] = teacherCount.count || 0
        stats['ห้องเรียน'] = classCount.count || 0
      }

      return {
        success: true,
        data: {
          type: 'statistics',
          stats
        },
        metadata: {
          executionTime: Date.now() - startTime,
          dataSource: 'database',
          queryExecuted: 'multiple counts'
        }
      }

    } catch (error) {
      return {
        success: false,
        error: ErrorService.fromError(error, 'Failed to fetch statistics')
      }
    }
  }
}
