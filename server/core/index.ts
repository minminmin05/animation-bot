/**
 * Core Module Index
 *
 * Central export point for all core infrastructure services
 *
 * This module provides:
 * - Error handling (errors/)
 * - Entity extraction (entities/)
 * - Query normalization (normalization/)
 * - Handler interfaces and registry (handlers/)
 * - Repository interfaces and base (repositories/)
 */

// Error handling
export * from './errors/index.js'

// Entity extraction
export * from './entities/index.js'

// Query normalization
export * from './normalization/index.js'

// Handler interfaces and registry
export * from './handlers/index.js'

// Repository interfaces and base
export * from './repositories/index.js'
