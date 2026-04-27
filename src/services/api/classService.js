/**
 * Class Service
 *
 * Handles all class-related API operations including:
 * - Class CRUD operations
 * - Student enrollment
 * - Subject assignments
 * - Schedule management
 */

import BaseService from './baseService'
import { API_ENDPOINTS } from './config'

class ClassService extends BaseService {
  /**
   * Get all classes with optional filtering
   * @param {Object} filters - Filter options (grade, section, etc.)
   * @returns {Promise<Array>} List of classes
   */
  async getClasses(filters = {}) {
    return this.get(API_ENDPOINTS.classes.list, filters)
  }

  /**
   * Get a single class by ID
   * @param {string} classId - Class ID
   * @returns {Promise<Object>} Class data
   */
  async getClass(classId) {
    return this.get(API_ENDPOINTS.classes.detail(classId))
  }

  /**
   * Create a new class
   * @param {Object} classData - Class information
   * @returns {Promise<Object>} Created class data
   */
  async createClass(classData) {
    return this.post(API_ENDPOINTS.classes.create, classData)
  }

  /**
   * Update class information
   * @param {string} classId - Class ID
   * @param {Object} classData - Updated class information
   * @returns {Promise<Object>} Updated class data
   */
  async updateClass(classId, classData) {
    return this.put(API_ENDPOINTS.classes.update(classId), classData)
  }

  /**
   * Delete a class
   * @param {string} classId - Class ID
   * @returns {Promise<void>}
   */
  async deleteClass(classId) {
    return this.delete(API_ENDPOINTS.classes.delete(classId))
  }

  /**
   * Get students in a class
   * @param {string} classId - Class ID
   * @returns {Promise<Array>} Students in the class
   */
  async getClassStudents(classId) {
    return this.get(API_ENDPOINTS.classes.students(classId))
  }

  /**
   * Add students to a class
   * @param {string} classId - Class ID
   * @param {Array<string>} studentIds - Student IDs to add
   * @returns {Promise<Object>} Enrollment result
   */
  async addStudents(classId, studentIds) {
    return this.post(`/api/classes/${classId}/students`, { studentIds })
  }

  /**
   * Remove students from a class
   * @param {string} classId - Class ID
   * @param {Array<string>} studentIds - Student IDs to remove
   * @returns {Promise<Object>} Removal result
   */
  async removeStudents(classId, studentIds) {
    return this.delete(`/api/classes/${classId}/students`, { studentIds })
  }

  /**
   * Get subjects assigned to a class
   * @param {string} classId - Class ID
   * @returns {Promise<Array>} Subjects in the class
   */
  async getClassSubjects(classId) {
    return this.get(API_ENDPOINTS.classes.subjects(classId))
  }

  /**
   * Assign subject to class
   * @param {string} classId - Class ID
   * @param {string} subjectId - Subject ID
   * @param {string} teacherId - Teacher ID
   * @returns {Promise<Object>} Assignment result
   */
  async assignSubject(classId, subjectId, teacherId) {
    return this.post(`/api/classes/${classId}/subjects`, {
      subjectId,
      teacherId,
    })
  }

  /**
   * Remove subject from class
   * @param {string} classId - Class ID
   * @param {string} assignmentId - Assignment ID
   * @returns {Promise<void>}
   */
  async removeSubject(classId, assignmentId) {
    return this.delete(`/api/classes/${classId}/subjects/${assignmentId}`)
  }

  /**
   * Get class schedule
   * @param {string} classId - Class ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Class schedule
   */
  async getClassSchedule(classId, filters = {}) {
    return this.get(API_ENDPOINTS.classes.schedule(classId), filters)
  }

  /**
   * Get class attendance report
   * @param {string} classId - Class ID
   * @param {Object} filters - Date range, etc.
   * @returns {Promise<Object>} Attendance report
   */
  async getClassAttendance(classId, filters = {}) {
    return this.get(`/api/classes/${classId}/attendance`, filters)
  }

  /**
   * Get class grade report
   * @param {string} classId - Class ID
   * @param {Object} filters - Subject, term, etc.
   * @returns {Promise<Object>} Grade report
   */
  async getClassGrades(classId, filters = {}) {
    return this.get(`/api/classes/${classId}/grades`, filters)
  }

  /**
   * Promote class to next grade
   * @param {string} classId - Class ID
   * @returns {Promise<Object>} Promotion result
   */
  async promoteClass(classId) {
    return this.post(`/api/classes/${classId}/promote`)
  }
}

// Export singleton instance
export default new ClassService()
