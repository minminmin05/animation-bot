/**
 * Grades Handler
 *
 * Handles requests for student grade information.
 */

import {
  BaseHandler,
  HandlerContext,
  HandlerResult,
  Action
} from '../handler.interface.js'
import { Permission, UserRole } from '../handler.interface.js'
import { ErrorService } from '../../errors/index.js'

/**
 * Grades handler for student grade information
 */
export class GradesHandler extends BaseHandler {
  readonly action = Action.GET_GRADES
  readonly requiredPermissions = [Permission.READ_GRADES]
  readonly requiredEntities = [] // Person entity is optional

  canHandle(context: HandlerContext): boolean {
    return context.action === Action.GET_GRADES
  }

  validate(context: HandlerContext): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Must have either a person mentioned OR a user ID
    if (context.entities.people.length === 0 && !context.userId) {
      errors.push('No student specified')
    }

    return { valid: errors.length === 0, errors }
  }

  async execute(context: HandlerContext): Promise<HandlerResult> {
    const startTime = Date.now()

    try {
      // Import grade service
      const { getPersonalDataByAction } = await import('../../../services/grade.service.js')

      // Determine target student
      let targetPerson = null
      if (context.entities.people.length > 0) {
        targetPerson = context.entities.people[0]
      }

      // Get grades using existing service
      const result = await getPersonalDataByAction(
        'grades',
        context.userId || '',
        context.userRole || UserRole.STUDENT,
        targetPerson
      )

      if (result.error) {
        return {
          success: false,
          error: ErrorService.fromError(new Error(result.error))
        }
      }

      return {
        success: true,
        data: {
          type: 'grades',
          ...result.data,
          studentName: targetPerson || 'คุณ'
        },
        metadata: {
          executionTime: Date.now() - startTime,
          dataSource: 'database',
          queryExecuted: 'getPersonalDataByAction:grades'
        }
      }

    } catch (error) {
      return {
        success: false,
        error: ErrorService.fromError(error, 'Failed to fetch grades')
      }
    }
  }
}
