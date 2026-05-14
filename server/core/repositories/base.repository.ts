/**
 * Base Repository
 *
 * Provides common database operations for all repositories.
 * Extending repositories should implement domain-specific methods.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import {
  IRepository,
  QueryFilter,
  PaginatedResult,
  PaginationOptions
} from './repository.interface.js'
import { ErrorService, AppError } from '../errors/index.js'

/**
 * Base repository with common CRUD operations
 */
export abstract class BaseRepository<T> implements IRepository<T> {
  protected supabase: SupabaseClient

  constructor(
    protected tableName: string,
    supabaseUrl?: string,
    supabaseKey?: string
  ) {
    // Use provided client or create new one
    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey)
    } else {
      // Use existing environment variables
      this.supabase = createClient(
        process.env.SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_KEY || ''
      )
    }
  }

  /**
   * Find a single entity by ID
   */
  async findById(id: string): Promise<T | null> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select()
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return null
        }
        throw ErrorService.databaseError(
          `Failed to find ${this.tableName} by id: ${error.message}`
        )
      }

      return data as T
    } catch (error) {
      if (error instanceof AppError) throw error
      throw ErrorService.databaseError(
        `Unexpected error in ${this.tableName}.findById: ${error}`
      )
    }
  }

  /**
   * Find multiple entities with optional filters
   */
  async findMany(filter: QueryFilter = {}): Promise<T[]> {
    try {
      let query = this.supabase.from(this.tableName).select()

      // Apply filters
      query = this.applyFilters(query, filter)

      // Apply ordering
      if (filter.orderBy) {
        query = query.order(filter.orderBy.column, {
          ascending: filter.orderBy.direction === 'asc'
        })
      }

      // Apply limit
      if (filter.limit) {
        query = query.limit(filter.limit)
      }

      // Apply offset
      if (filter.offset) {
        query = query.range(filter.offset, filter.offset + (filter.limit || 100) - 1)
      }

      const { data, error } = await query

      if (error) {
        throw ErrorService.databaseError(
          `Failed to find ${this.tableName}: ${error.message}`
        )
      }

      return (data || []) as T[]
    } catch (error) {
      if (error instanceof AppError) throw error
      throw ErrorService.databaseError(
        `Unexpected error in ${this.tableName}.findMany: ${error}`
      )
    }
  }

  /**
   * Find a single entity matching the filter
   */
  async findOne(filter: QueryFilter): Promise<T | null> {
    const results = await this.findMany({ ...filter, limit: 1 })
    return results[0] || null
  }

  /**
   * Create a new entity
   */
  async create(entity: Partial<T>): Promise<T> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .insert(entity)
        .select()
        .single()

      if (error) {
        throw ErrorService.databaseError(
          `Failed to create ${this.tableName}: ${error.message}`
        )
      }

      return data as T
    } catch (error) {
      if (error instanceof AppError) throw error
      throw ErrorService.databaseError(
        `Unexpected error in ${this.tableName}.create: ${error}`
      )
    }
  }

  /**
   * Update an entity
   */
  async update(id: string, updates: Partial<T>): Promise<T | null> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw ErrorService.databaseError(
          `Failed to update ${this.tableName}: ${error.message}`
        )
      }

      return data as T
    } catch (error) {
      if (error instanceof AppError) throw error
      throw ErrorService.databaseError(
        `Unexpected error in ${this.tableName}.update: ${error}`
      )
    }
  }

  /**
   * Delete an entity
   */
  async delete(id: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .eq('id', id)

      if (error) {
        throw ErrorService.databaseError(
          `Failed to delete ${this.tableName}: ${error.message}`
        )
      }

      return true
    } catch (error) {
      if (error instanceof AppError) throw error
      throw ErrorService.databaseError(
        `Unexpected error in ${this.tableName}.delete: ${error}`
      )
    }
  }

  /**
   * Count entities matching the filter
   */
  async count(filter: QueryFilter = {}): Promise<number> {
    try {
      let query = this.supabase.from(this.tableName).select('*', { count: 'exact', head: true })

      // Apply filters (without selecting data)
      query = this.applyFilters(query, filter)

      const { count, error } = await query

      if (error) {
        throw ErrorService.databaseError(
          `Failed to count ${this.tableName}: ${error.message}`
        )
      }

      return count || 0
    } catch (error) {
      if (error instanceof AppError) throw error
      throw ErrorService.databaseError(
        `Unexpected error in ${this.tableName}.count: ${error}`
      )
    }
  }

  /**
   * Check if an entity exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.count({ where: { id } })
    return count > 0
  }

  /**
   * Find with pagination
   */
  async findPaginated(
    filter: QueryFilter = {},
    pagination: PaginationOptions = { page: 1, pageSize: 20 }
  ): Promise<PaginatedResult<T>> {
    const total = await this.count(filter)
    const totalPages = Math.ceil(total / pagination.pageSize)

    const offset = (pagination.page - 1) * pagination.pageSize

    const data = await this.findMany({
      ...filter,
      offset,
      limit: pagination.pageSize
    })

    return {
      data,
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages
    }
  }

  /**
   * Apply filters to a Supabase query
   * @protected
   */
  protected applyFilters(query: any, filter: QueryFilter): any {
    if (filter.where) {
      for (const [key, value] of Object.entries(filter.where)) {
        if (value === null || value === undefined) {
          continue
        }

        if (Array.isArray(value)) {
          // Use .in() for arrays (safe, no string interpolation)
          query = query.in(key, value)
        } else if (typeof value === 'object') {
          // Handle operators like { gt: 5, lt: 10 }
          for (const [op, opValue] of Object.entries(value)) {
            switch (op) {
              case 'gt':
                query = query.gt(key, opValue)
                break
              case 'gte':
                query = query.gte(key, opValue)
                break
              case 'lt':
                query = query.lt(key, opValue)
                break
              case 'lte':
                query = query.lte(key, opValue)
                break
              case 'like':
                query = query.like(key, opValue)
                break
              case 'ilike':
                query = query.ilike(key, opValue)
                break
              case 'neq':
                query = query.neq(key, opValue)
                break
            }
          }
        } else {
          // Simple equality
          query = query.eq(key, value)
        }
      }
    }

    return query
  }

  /**
   * Execute a raw SQL function (RPC)
   * @protected
   */
  protected async rpc<R>(
    functionName: string,
    params: Record<string, unknown> = {}
  ): Promise<R> {
    try {
      const { data, error } = await this.supabase.rpc(functionName, params)

      if (error) {
        throw ErrorService.databaseError(
          `RPC call ${functionName} failed: ${error.message}`
        )
      }

      return data as R
    } catch (error) {
      if (error instanceof AppError) throw error
      throw ErrorService.databaseError(
        `Unexpected error in RPC call ${functionName}: ${error}`
      )
    }
  }
}

/**
 * Base repository with soft delete support
 */
export abstract class SoftDeleteRepository<T> extends BaseRepository<T> {
  /**
   * Soft delete an entity (sets deleted_at timestamp)
   */
  async softDelete(id: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from(this.tableName)
        .update({ deleted_at: new Date().toISOString() } as Partial<T>)
        .eq('id', id)

      if (error) {
        throw ErrorService.databaseError(
          `Failed to soft delete ${this.tableName}: ${error.message}`
        )
      }

      return true
    } catch (error) {
      if (error instanceof AppError) throw error
      throw ErrorService.databaseError(
        `Unexpected error in ${this.tableName}.softDelete: ${error}`
      )
    }
  }

  /**
   * Restore a soft-deleted entity
   */
  async restore(id: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from(this.tableName)
        .update({ deleted_at: null } as Partial<T>)
        .eq('id', id)

      if (error) {
        throw ErrorService.databaseError(
          `Failed to restore ${this.tableName}: ${error.message}`
        )
      }

      return true
    } catch (error) {
      if (error instanceof AppError) throw error
      throw ErrorService.databaseError(
        `Unexpected error in ${this.tableName}.restore: ${error}`
      )
    }
  }

  /**
   * Find only non-deleted entities
   */
  async findActive(filter: QueryFilter = {}): Promise<T[]> {
    return this.findMany({
      ...filter,
      where: {
        ...filter.where,
        deleted_at: null
      }
    })
  }
}
