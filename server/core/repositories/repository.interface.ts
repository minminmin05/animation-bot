/**
 * Repository Interfaces
 *
 * Defines the contract for all repositories in the system.
 * Repositories provide a clean abstraction over database operations.
 */

/**
 * Generic filter interface for queries
 */
export interface QueryFilter {
  where?: Record<string, unknown>
  orderBy?: { column: string; direction: 'asc' | 'desc' }
  limit?: number
  offset?: number
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  page: number
  pageSize: number
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * Base repository interface
 */
export interface IRepository<T> {
  /**
   * Find a single entity by ID
   */
  findById(id: string): Promise<T | null>

  /**
   * Find multiple entities with optional filters
   */
  findMany(filter?: QueryFilter): Promise<T[]>

  /**
   * Find a single entity matching the filter
   */
  findOne(filter: QueryFilter): Promise<T | null>

  /**
   * Create a new entity
   */
  create(entity: Partial<T>): Promise<T>

  /**
   * Update an entity
   */
  update(id: string, updates: Partial<T>): Promise<T | null>

  /**
   * Delete an entity
   */
  delete(id: string): Promise<boolean>

  /**
   * Count entities matching the filter
   */
  count(filter?: QueryFilter): Promise<number>

  /**
   * Check if an entity exists
   */
  exists(id: string): Promise<boolean>
}

/**
 * Repository with soft delete support
 */
export interface ISoftDeleteRepository<T> extends IRepository<T> {
  /**
   * Soft delete an entity (sets deleted_at timestamp)
   */
  softDelete(id: string): Promise<boolean>

  /**
   * Restore a soft-deleted entity
   */
  restore(id: string): Promise<boolean>

  /**
   * Find only non-deleted entities
   */
  findActive(filter?: QueryFilter): Promise<T[]>
}
