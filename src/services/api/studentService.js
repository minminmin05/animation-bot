/**
 * Student Service
 *
 * Handles all student-related API operations including:
 * - Student CRUD operations
 * - Grade management
 * - Attendance tracking
 * - Schedule management
 */

import BaseService from './baseService'
import { API_ENDPOINTS } from './config'

class StudentService extends BaseService {
  /**
   * Get all students with optional filtering
   * @param {Object} filters - Filter options (class, grade, status, etc.)
   * @returns {Promise<Array>} List of students
   */
  async getStudents(filters = {}) {
    return this.get(API_ENDPOINTS.students.list, filters)
  }

  /**
   * Get a single student by ID
   * @param {string} studentId - Student ID
   * @returns {Promise<Object>} Student data
   */
  async getStudent(studentId) {
    return this.get(API_ENDPOINTS.students.detail(studentId))
  }

  /**
   * Create a new student
   * @param {Object} studentData - Student information
   * @returns {Promise<Object>} Created student data
   */
  async createStudent(studentData) {
    return this.post(API_ENDPOINTS.students.create, studentData)
  }

  /**
   * Update student information
   * @param {string} studentId - Student ID
   * @param {Object} studentData - Updated student information
   * @returns {Promise<Object>} Updated student data
   */
  async updateStudent(studentId, studentData) {
    return this.put(API_ENDPOINTS.students.update(studentId), studentData)
  }

  /**
   * Delete a student
   * @param {string} studentId - Student ID
   * @returns {Promise<void>}
   */
  async deleteStudent(studentId) {
    return this.delete(API_ENDPOINTS.students.delete(studentId))
  }

  /**
   * Get student grades
   * @param {string} studentId - Student ID
   * @param {Object} filters - Filter options (term, subject, etc.)
   * @returns {Promise<Array>} Student grades
   */
  async getStudentGrades(studentId, filters = {}) {
    return this.get(API_ENDPOINTS.students.grades(studentId), filters)
  }

  /**
   * Get student attendance records
   * @param {string} studentId - Student ID
   * @param {Object} filters - Filter options (date range, etc.)
   * @returns {Promise<Array>} Attendance records
   */
  async getStudentAttendance(studentId, filters = {}) {
    return this.get(API_ENDPOINTS.students.attendance(studentId), filters)
  }

  /**
   * Get student class schedule
   * @param {string} studentId - Student ID
   * @param {Object} filters - Filter options (term, week, etc.)
   * @returns {Promise<Array>} Class schedule
   */
  async getStudentSchedule(studentId, filters = {}) {
    return this.get(API_ENDPOINTS.students.schedule(studentId), filters)
  }

  /**
   * Search for students
   * @param {string} query - Search query
   * @param {Object} filters - Additional filters
   * @returns {Promise<Array>} Matching students
   */
  async searchStudents(query, filters = {}) {
    return this.get(API_ENDPOINTS.students.list, {
      q: query,
      ...filters,
    })
  }

  /**
   * Get students by class
   * @param {string} classId - Class ID
   * @returns {Promise<Array>} Students in the class
   */
  async getStudentsByClass(classId) {
    return this.get(API_ENDPOINTS.students.list, { classId })
  }

  /**
   * Promote students to next grade
   * @param {Array<string>} studentIds - List of student IDs
   * @returns {Promise<Object>} Promotion results
   */
  async promoteStudents(studentIds) {
    return this.post('/api/students/promote', { studentIds })
  }

  /**
   * Get student statistics
   * @param {string} studentId - Student ID
   * @returns {Promise<Object>} Student statistics
   */
  async getStudentStats(studentId) {
    return this.get(`/api/students/${studentId}/stats`)
  }
}

// Export singleton instance
export default new StudentService()
