/**
 * API Services Index
 *
 * Central export point for all API services
 */

import { validateConfig } from './config'

// Validate configuration on import
const configValid = validateConfig()
if (!configValid) {
  console.warn(
    'API configuration is incomplete. Please check your .env file and API configuration.'
  )
}

// Export all services
export { default as StudentService } from './studentService'
export { default as TeacherService } from './teacherService'
export { default as ParentService } from './parentService'
export { default as ClassService } from './classService'
export { default as AuthService } from './authService'
export { default as BaseService } from './baseService'

// Export configuration
export * from './config'
