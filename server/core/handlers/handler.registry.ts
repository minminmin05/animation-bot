/**
 * Handler Registry
 *
 * Manages all action handlers and provides a centralized
 * point for handler execution.
 */

import {
  Action,
  ActionHandler,
  HandlerContext,
  HandlerResult,
  ValidationResult
} from './handler.interface.js'
import { ErrorService, AppError } from '../errors/index.js'

/**
 * Handler execution options
 */
export interface ExecutionOptions {
  /** Whether to use fallback handlers on failure */
  useFallback?: boolean

  /** Timeout in milliseconds */
  timeout?: number

  /** Additional context for execution */
  context?: Record<string, unknown>
}

/**
 * Handler registry class
 */
export class HandlerRegistry {
  private handlers: Map<Action, ActionHandler> = new Map()
  private fallbackHandlers: Map<Action, ActionHandler> = new Map()

  /**
   * Register a handler for an action
   */
  register(handler: ActionHandler): void {
    this.handlers.set(handler.action, handler)
    console.log(`[HandlerRegistry] Registered handler for ${handler.action}`)
  }

  /**
   * Register a fallback handler for an action
   */
  registerFallback(action: Action, handler: ActionHandler): void {
    this.fallbackHandlers.set(action, handler)
    console.log(`[HandlerRegistry] Registered fallback handler for ${action}`)
  }

  /**
   * Get a handler for an action
   */
  get(action: Action): ActionHandler | undefined {
    return this.handlers.get(action)
  }

  /**
   * Get a fallback handler for an action
   */
  getFallback(action: Action): ActionHandler | undefined {
    return this.fallbackHandlers.get(action)
  }

  /**
   * Check if a handler exists for an action
   */
  has(action: Action): boolean {
    return this.handlers.has(action)
  }

  /**
   * Get all registered actions
   */
  getActions(): Action[] {
    return Array.from(this.handlers.keys())
  }

  /**
   * Validate context before handler execution
   */
  validate(context: HandlerContext): ValidationResult {
    const handler = this.get(context.action)

    if (!handler) {
      return {
        valid: false,
        errors: [`No handler registered for action: ${context.action}`]
      }
    }

    if (!handler.canHandle(context)) {
      return {
        valid: false,
        errors: [`Handler cannot handle this context for action: ${context.action}`]
      }
    }

    return handler.validate(context)
  }

  /**
   * Execute a handler with error handling and optional fallback
   */
  async execute(
    context: HandlerContext,
    options: ExecutionOptions = {}
  ): Promise<HandlerResult> {
    const startTime = Date.now()

    ErrorService.logInfo(
      'HandlerRegistry',
      `Executing handler for ${context.action}`,
      {
        action: context.action,
        userId: context.userId,
        hasEntities: Object.keys(context.entities).length > 0
      }
    )

    try {
      // Get the handler
      const handler = this.get(context.action)

      if (!handler) {
        return {
          success: false,
          error: ErrorService.notFound('Handler', context.action),
          metadata: {
            executionTime: Date.now() - startTime,
            dataSource: 'database'
          }
        }
      }

      // Validate the context
      const validation = handler.validate(context)
      if (!validation.valid) {
        return {
          success: false,
          error: ErrorService.validationFailed(
            validation.errors.join(', '),
            'Invalid request context'
          ),
          metadata: {
            executionTime: Date.now() - startTime,
            dataSource: 'database'
          }
        }
      }

      // Check if handler can handle this context
      if (!handler.canHandle(context)) {
        return {
          success: false,
          error: ErrorService.validationFailed(
            `Handler cannot handle this context`,
            'Cannot process this request'
          ),
          metadata: {
            executionTime: Date.now() - startTime,
            dataSource: 'database'
          }
        }
      }

      // Execute with timeout if specified
      const result = options.timeout
        ? await this.executeWithTimeout(handler, context, options.timeout)
        : await handler.execute(context)

      // Add execution time
      if (result.metadata) {
        result.metadata.executionTime = Date.now() - startTime
      }

      ErrorService.logInfo(
        'HandlerRegistry',
        `Handler ${context.action} completed: ${result.success ? 'success' : 'failed'}`,
        {
          success: result.success,
          executionTime: result.metadata?.executionTime
        }
      )

      return result

    } catch (error) {
      const appError = ErrorService.fromError(error, 'Handler execution failed')
      ErrorService.log(appError, 'HandlerRegistry', {
        action: context.action,
        userId: context.userId
      })

      // Try fallback if enabled
      if (options.useFallback !== false) {
        const fallbackResult = await this.executeFallback(context, options)
        if (fallbackResult) {
          ErrorService.logInfo(
            'HandlerRegistry',
            `Fallback handler succeeded for ${context.action}`
          )
          return fallbackResult
        }
      }

      return {
        success: false,
        error: appError,
        metadata: {
          executionTime: Date.now() - startTime,
          dataSource: 'database'
        }
      }
    }
  }

  /**
   * Execute handler with timeout
   */
  private async executeWithTimeout(
    handler: ActionHandler,
    context: HandlerContext,
    timeout: number
  ): Promise<HandlerResult> {
    return Promise.race([
      handler.execute(context),
      new Promise<HandlerResult>((_, reject) =>
        setTimeout(() => reject(new Error('Handler execution timeout')), timeout)
      )
    ])
  }

  /**
   * Execute fallback handler
   */
  private async executeFallback(
    context: HandlerContext,
    options: ExecutionOptions
  ): Promise<HandlerResult | null> {
    const fallback = this.getFallback(context.action)

    if (!fallback) {
      return null
    }

    try {
      ErrorService.logWarning(
        'HandlerRegistry',
        `Using fallback handler for ${context.action}`
      )

      const result = options.timeout
        ? await this.executeWithTimeout(fallback, context, options.timeout)
        : await fallback.execute(context)

      return result
    } catch (error) {
      ErrorService.log(
        ErrorService.fromError(error),
        'HandlerRegistry',
        { action: context.action, fallback: true }
      )
      return null
    }
  }

  /**
   * Get handler statistics
   */
  getStats(): {
    registeredHandlers: number
    registeredActions: Action[]
    fallbackHandlers: number
  } {
    return {
      registeredHandlers: this.handlers.size,
      registeredActions: this.getActions(),
      fallbackHandlers: this.fallbackHandlers.size
    }
  }
}

/**
 * Global handler registry instance
 */
let globalRegistry: HandlerRegistry | null = null

/**
 * Get or create the global handler registry
 */
export function getHandlerRegistry(): HandlerRegistry {
  if (!globalRegistry) {
    globalRegistry = new HandlerRegistry()
  }
  return globalRegistry
}

/**
 * Reset the global handler registry (for testing)
 */
export function resetHandlerRegistry(): void {
  globalRegistry = null
}
