/**
 * Repository Factory
 *
 * Creates and manages repository instances.
 * Provides a single point of access for all repositories.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { BaseRepository, SoftDeleteRepository } from './base.repository.js'

/**
 * Repository types
 */
export type RepositoryType =
  | 'student'
  | 'teacher'
  | 'grade'
  | 'attendance'
  | 'schedule'
  | 'payment'
  | 'discipline'
  | 'class'
  | 'subject'
  | 'semester'
  | 'user'
  | 'access_policy'

/**
 * Repository Factory class
 */
export class RepositoryFactory {
  private static instance: RepositoryFactory
  private supabase: SupabaseClient
  private repositories: Map<RepositoryType, BaseRepository<any>> = new Map()

  private constructor() {
    // Initialize Supabase client
    const url = process.env.SUPABASE_URL || ''
    const key = process.env.SUPABASE_SERVICE_KEY || ''

    if (!url || !key) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set')
    }

    this.supabase = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })
  }

  /**
   * Get singleton instance
   */
  static getInstance(): RepositoryFactory {
    if (!RepositoryFactory.instance) {
      RepositoryFactory.instance = new RepositoryFactory()
    }
    return RepositoryFactory.instance
  }

  /**
   * Get Supabase client
   */
  getSupabase(): SupabaseClient {
    return this.supabase
  }

  /**
   * Get a repository by type
   */
  get<T>(type: RepositoryType): BaseRepository<T> {
    if (!this.repositories.has(type)) {
      const repository = this.createRepository(type)
      this.repositories.set(type, repository)
    }

    return this.repositories.get(type) as BaseRepository<T>
  }

  /**
   * Create a new repository instance
   */
  private createRepository(type: RepositoryType): BaseRepository<any> {
    // Lazy import to avoid circular dependencies
    switch (type) {
      case 'student':
        const { StudentRepository } = require('./repositories/student.repository.js')
        return new StudentRepository(this.supabase)

      case 'teacher':
        const { TeacherRepository } = require('./repositories/teacher.repository.js')
        return new TeacherRepository(this.supabase)

      case 'grade':
        const { GradeRepository } = require('./repositories/grade.repository.js')
        return new GradeRepository(this.supabase)

      case 'attendance':
        const { AttendanceRepository } = require('./repositories/attendance.repository.js')
        return new AttendanceRepository(this.supabase)

      case 'schedule':
        const { ScheduleRepository } = require('./repositories/schedule.repository.js')
        return new ScheduleRepository(this.supabase)

      case 'payment':
        const { PaymentRepository } = require('./repositories/payment.repository.js')
        return new PaymentRepository(this.supabase)

      case 'discipline':
        const { DisciplineRepository } = require('./repositories/discipline.repository.js')
        return new DisciplineRepository(this.supabase)

      case 'class':
        const { ClassRepository } = require('./repositories/class.repository.js')
        return new ClassRepository(this.supabase)

      case 'subject':
        const { SubjectRepository } = require('./repositories/subject.repository.js')
        return new SubjectRepository(this.supabase)

      case 'semester':
        const { SemesterRepository } = require('./repositories/semester.repository.js')
        return new SemesterRepository(this.supabase)

      case 'user':
        const { UserRepository } = require('./repositories/user.repository.js')
        return new UserRepository(this.supabase)

      case 'access_policy':
        const { AccessPolicyRepository } = require('./repositories/access-policy.repository.js')
        return new AccessPolicyRepository(this.supabase)

      default:
        throw new Error(`Unknown repository type: ${type}`)
    }
  }

  /**
   * Close all connections (for cleanup)
   */
  async close(): Promise<void> {
    this.repositories.clear()
  }
}

/**
 * Convenience function to get a repository
 */
export function getRepository<T>(type: RepositoryType): BaseRepository<T> {
  return RepositoryFactory.getInstance().get<T>(type)
}

/**
 * Get the Supabase client
 */
export function getSupabase(): SupabaseClient {
  return RepositoryFactory.getInstance().getSupabase()
}
