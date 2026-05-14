/**
 * Repository Module - Unified database access layer
 *
 * Exports all repository interfaces, base classes, and factory
 */

export * from './repository.interface.js'
export * from './base.repository.js'
export * from './repository.factory.js'

// Re-export concrete repositories when they exist
// export * from './repositories/student.repository.js'
// export * from './repositories/grade.repository.js'
// etc.
