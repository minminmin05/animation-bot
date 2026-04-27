/**
 * Teacher Service
 *
 * Handles all teacher-related API operations including:
 * - Teacher CRUD operations
 * - Class assignments
 * - Grade submissions
 * - Schedule management
 */

import BaseService from './baseService'
import { API_ENDPOINTS } from './config'

class TeacherService extends BaseService {
  /**
   * Get all teachers with optional filtering
   * @param {Object} filters - Filter options (department, status, etc.)
   * @returns {Promise<Array>} List of teachers
   */
  async getTeachers(filters = {}) {
    return this.get(API_ENDPOINTS.teachers.list, filters)
  }

  /**
   * Get a single teacher by ID
   * @param {string} teacherId - Teacher ID
   * @returns {Promise<Object>} Teacher data
   */
  async getTeacher(teacherId) {
    return this.get(API_ENDPOINTS.teachers.detail(teacherId))
  }

  /**
   * Create a new teacher
   * @param {Object} teacherData - Teacher information
   * @returns {Promise<Object>} Created teacher data
   */
  async createTeacher(teacherData) {
    return this.post(API_ENDPOINTS.teachers.create, teacherData)
  }

  /**
   * Update teacher information
   * @param {string} teacherId - Teacher ID
   * @param {Object} teacherData - Updated teacher information
   * @returns {Promise<Object>} Updated teacher data
   */
  async updateTeacher(teacherId, teacherData) {
    return this.put(API_ENDPOINTS.teachers.update(teacherId), teacherData)
  }

  /**
   * Delete a teacher
   * @param {string} teacherId - Teacher ID
   * @returns {Promise<void>}
   */
  async deleteTeacher(teacherId) {
    return this.delete(API_ENDPOINTS.teachers.delete(teacherId))
  }

  /**
   * Get teacher's assigned classes
   * @param {string} teacherId - Teacher ID
   * @param {Object} filters - Filter options (term, year, etc.)
   * @returns {Promise<Array>} Teacher's classes
   */
  async getTeacherClasses(teacherId, filters = {}) {
    return this.get(API_ENDPOINTS.teachers.classes(teacherId), filters)
  }

  /**
   * Get teacher's assignments
   * @param {string} teacherId - Teacher ID
   * @param {Object} filters - Filter options (subject, class, etc.)
   * @returns {Promise<Array>} Teacher's assignments
   */
  async getTeacherAssignments(teacherId, filters = {}) {
    return this.get(API_ENDPOINTS.teachers.assignments(teacherId), filters)
  }

  /**
   * Assign a teacher to a class
   * @param {string} teacherId - Teacher ID
   * @param {string} classId - Class ID
   * @param {string} subjectId - Subject ID
   * @returns {Promise<Object>} Assignment data
   */
  async assignToClass(teacherId, classId, subjectId) {
    return this.post('/api/teachers/assign', {
      teacherId,
      classId,
      subjectId,
    })
  }

  /**
   * Remove teacher from class
   * @param {string} assignmentId - Assignment ID
   * @returns {Promise<void>}
   */
  async removeFromClass(assignmentId) {
    return this.delete(`/api/teachers/assignments/${assignmentId}`)
  }

  /**
   * Submit grades for students
   * @param {string} teacherId - Teacher ID
   * @param {Object} gradeData - Grade submission data
   * @returns {Promise<Object>} Submission result
   */
  async submitGrades(teacherId, gradeData) {
    return this.post('/api/grades/submit', {
      teacherId,
      ...gradeData,
    })
  }

  /**
   * Get teacher schedule
   * @param {string} teacherId - Teacher ID
   * @param {Object} filters - Filter options (term, week, etc.)
   * @returns {Promise<Array>} Teacher schedule
   */
  async getTeacherSchedule(teacherId, filters = {}) {
    return this.get(`/api/teachers/${teacherId}/schedule`, filters)
  }

  /**
   * Search for teachers
   * @param {string} query - Search query
   * @param {Object} filters - Additional filters
   * @returns {Promise<Array>} Matching teachers
   */
  async searchTeachers(query, filters = {}) {
    return this.get(API_ENDPOINTS.teachers.list, {
      q: query,
      ...filters,
    })
  }

  /**
   * Get teachers by department
   * @param {string} departmentId - Department ID
   * @returns {Promise<Array>} Teachers in the department
   */
  async getTeachersByDepartment(departmentId) {
    return this.get(API_ENDPOINTS.teachers.list, { departmentId })
  }

  /**
   * Get available substitute teachers
   * @param {Object} filters - Filter options (date, period, etc.)
   * @returns {Promise<Array>} Available substitute teachers
   */
  async getSubstitutes(filters = {}) {
    return this.get('/api/teachers/substitutes', filters)
  }
}

// Export singleton instance
export default new TeacherService()
