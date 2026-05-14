/**
 * Repository Module Index
 *
 * Exports all repositories for domain-specific data access
 */

// Export repositories
export { StudentRepository, type Student, type StudentWithRelations } from './student.repository.js'
export { GradeRepository, type StudentSubjectGrade, type GradeWithDetails, type GradeStatistics } from './grade.repository.js'
export { AttendanceRepository, type Attendance, type AttendanceWithDetails, type AttendanceSummary } from './attendance.repository.js'
export { ScheduleRepository, type Class, type ClassWithDetails, type ScheduleSlot } from './schedule.repository.js'
export { PaymentRepository, type Payment, type PaymentWithDetails, type PaymentSummary } from './payment.repository.js'
