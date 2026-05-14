/**
 * Payment Repository
 *
 * Repository for payment/tuition-related database operations
 */

import { BaseRepository } from '../core/repositories/base.repository.js'
import { ErrorService } from '../core/errors/index.js'

export interface Payment {
  id: string
  student_id: string
  amount: number
  currency: string
  due_date: string | null
  paid_date: string | null
  status: 'pending' | 'paid' | 'overdue' | 'cancelled'
  payment_method: string | null
  reference_number: string | null
  academic_year: string | null
  term: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface PaymentWithDetails extends Payment {
  students?: {
    id: string
    name: string
  }
}

export interface PaymentSummary {
  total_due: number
  total_paid: number
  total_overdue: number
  payment_count: number
  pending_count: number
  overdue_count: number
}

export class PaymentRepository extends BaseRepository<Payment> {
  constructor(supabaseUrl?: string, supabaseKey?: string) {
    super('payments', supabaseUrl, supabaseKey)
  }

  /**
   * Find payments for a student
   */
  async findByStudent(studentId: string, options?: {
    academicYear?: string
    term?: string
    status?: Payment['status']
    withDetails?: boolean
  }): Promise<PaymentWithDetails[]> {
    try {
      let selectQuery = '*'

      if (options?.withDetails) {
        selectQuery = `
          *,
          students (id, name)
        `
      }

      let query = this.supabase
        .from(this.tableName)
        .select(selectQuery)
        .eq('student_id', studentId)

      if (options?.academicYear) {
        query = query.eq('academic_year', options.academicYear)
      }
      if (options?.term) {
        query = query.eq('term', options.term)
      }
      if (options?.status) {
        query = query.eq('status', options.status)
      }

      query = query.order('due_date', { ascending: false })

      const { data, error } = await query

      if (error) {
        throw ErrorService.databaseError(`Failed to find payments: ${error.message}`)
      }

      return (data || []) as PaymentWithDetails[]
    } catch (error) {
      if (error instanceof Error && error.message.includes('database')) throw error
      throw ErrorService.databaseError(`Unexpected error in findByStudent: ${error}`)
    }
  }

  /**
   * Get payment summary for a student
   */
  async getStudentSummary(studentId: string, options?: {
    academicYear?: string
    term?: string
  }): Promise<PaymentSummary> {
    try {
      let query = this.supabase
        .from(this.tableName)
        .select('amount, status')
        .eq('student_id', studentId)

      if (options?.academicYear) {
        query = query.eq('academic_year', options.academicYear)
      }
      if (options?.term) {
        query = query.eq('term', options.term)
      }

      const { data, error } = await query

      if (error) {
        throw ErrorService.databaseError(`Failed to get payment summary: ${error.message}`)
      }

      const records = data || []
      const summary: PaymentSummary = {
        total_due: 0,
        total_paid: 0,
        total_overdue: 0,
        payment_count: 0,
        pending_count: 0,
        overdue_count: 0
      }

      for (const record of records) {
        const amount = parseFloat(record.amount) || 0

        switch (record.status) {
          case 'paid':
            summary.total_paid += amount
            summary.payment_count++
            break
          case 'pending':
            summary.total_due += amount
            summary.pending_count++
            break
          case 'overdue':
            summary.total_overdue += amount
            summary.overdue_count++
            break
        }
      }

      return summary
    } catch (error) {
      if (error instanceof Error && error.message.includes('database')) throw error
      throw ErrorService.databaseError(`Unexpected error in getStudentSummary: ${error}`)
    }
  }

  /**
   * Find overdue payments
   */
  async findOverdue(options?: {
    studentId?: string
    academicYear?: string
    limit?: number
  }): Promise<PaymentWithDetails[]> {
    try {
      let query = this.supabase
        .from(this.tableName)
        .select(`
          *,
          students (id, name)
        `)
        .eq('status', 'overdue')

      if (options?.studentId) {
        query = query.eq('student_id', options.studentId)
      }
      if (options?.academicYear) {
        query = query.eq('academic_year', options.academicYear)
      }

      query = query.order('due_date', { ascending: true })

      if (options?.limit) {
        query = query.limit(options.limit)
      }

      const { data, error } = await query

      if (error) {
        throw ErrorService.databaseError(`Failed to find overdue payments: ${error.message}`)
      }

      return (data || []) as PaymentWithDetails[]
    } catch (error) {
      if (error instanceof Error && error.message.includes('database')) throw error
      throw ErrorService.databaseError(`Unexpected error in findOverdue: ${error}`)
    }
  }

  /**
   * Create a payment record
   */
  async createPayment(payment: {
    student_id: string
    amount: number
    due_date?: string
    academic_year?: string
    term?: string
    notes?: string
  }): Promise<Payment> {
    return this.create({
      ...payment,
      currency: 'THB',
      status: 'pending'
    })
  }

  /**
   * Mark payment as paid
   */
  async markAsPaid(
    paymentId: string,
    paidDate: string,
    paymentMethod: string,
    referenceNumber?: string
  ): Promise<Payment | null> {
    return this.update(paymentId, {
      status: 'paid',
      paid_date: paidDate,
      payment_method: paymentMethod,
      reference_number: referenceNumber || null
    })
  }

  /**
   * Update payment status
   */
  async updateStatus(paymentId: string, status: Payment['status']): Promise<Payment | null> {
    return this.update(paymentId, { status })
  }

  /**
   * Get pending payments due soon (within next 30 days)
   */
  async getPendingDueSoon(limit = 20): Promise<PaymentWithDetails[]> {
    try {
      const today = new Date()
      const thirtyDaysLater = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]

      const { data, error } = await this.supabase
        .from(this.tableName)
        .select(`
          *,
          students (id, name)
        `)
        .eq('status', 'pending')
        .gte('due_date', today.toISOString().split('T')[0])
        .lte('due_date', thirtyDaysLater)
        .order('due_date', { ascending: true })
        .limit(limit)

      if (error) {
        throw ErrorService.databaseError(`Failed to get pending payments: ${error.message}`)
      }

      return (data || []) as PaymentWithDetails[]
    } catch (error) {
      if (error instanceof Error && error.message.includes('database')) throw error
      throw ErrorService.databaseError(`Unexpected error in getPendingDueSoon: ${error}`)
    }
  }
}
