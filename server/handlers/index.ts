/**
 * Handler Module Index
 *
 * Exports all action handlers and provides initialization function
 */

import { HandlerRegistry } from '../core/handlers/handler.registry.js'
import { StudentProfileHandler } from './student-profile.handler.js'
import { GradesHandler } from './grades.handler.js'
import { AttendanceHandler } from './attendance.handler.js'
import { ScheduleHandler } from './schedule.handler.js'
import { StatisticsHandler } from './statistics.handler.js'
import { KnowledgeHandler } from './knowledge.handler.js'

// Export all handlers
export { StudentProfileHandler } from './student-profile.handler.js'
export { GradesHandler } from './grades.handler.js'
export { AttendanceHandler } from './attendance.handler.js'
export { ScheduleHandler } from './schedule.handler.js'
export { StatisticsHandler } from './statistics.handler.js'
export { KnowledgeHandler } from './knowledge.handler.js'

/**
 * Initialize and register all handlers in the registry
 */
export function initializeHandlers(registry: HandlerRegistry): void {
  console.log('[Handlers] Initializing handlers...')

  // Register core handlers
  registry.register(new StudentProfileHandler())
  registry.register(new GradesHandler())
  registry.register(new AttendanceHandler())
  registry.register(new ScheduleHandler())
  registry.register(new StatisticsHandler())
  registry.register(new KnowledgeHandler())

  console.log('[Handlers] All handlers registered successfully')
  console.log('[Handlers] Stats:', registry.getStats())
}

/**
 * Create a handler registry with all handlers pre-registered
 */
export function createHandlerRegistry(): HandlerRegistry {
  const registry = new HandlerRegistry()
  initializeHandlers(registry)
  return registry
}
