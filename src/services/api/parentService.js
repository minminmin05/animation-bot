/**
 * Parent Service
 *
 * Handles all parent-related API operations including:
 * - Parent CRUD operations
 * - Child information access
 * - Communication with school
 * - Parent portal features
 */

import BaseService from './baseService'
import { API_ENDPOINTS } from './config'

class ParentService extends BaseService {
  /**
   * Get all parents with optional filtering
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} List of parents
   */
  async getParents(filters = {}) {
    return this.get(API_ENDPOINTS.parents.list, filters)
  }

  /**
   * Get a single parent by ID
   * @param {string} parentId - Parent ID
   * @returns {Promise<Object>} Parent data
   */
  async getParent(parentId) {
    return this.get(API_ENDPOINTS.parents.detail(parentId))
  }

  /**
   * Create a new parent
   * @param {Object} parentData - Parent information
   * @returns {Promise<Object>} Created parent data
   */
  async createParent(parentData) {
    return this.post(API_ENDPOINTS.parents.create, parentData)
  }

  /**
   * Update parent information
   * @param {string} parentId - Parent ID
   * @param {Object} parentData - Updated parent information
   * @returns {Promise<Object>} Updated parent data
   */
  async updateParent(parentId, parentData) {
    return this.put(API_ENDPOINTS.parents.update(parentId), parentData)
  }

  /**
   * Delete a parent
   * @param {string} parentId - Parent ID
   * @returns {Promise<void>}
   */
  async deleteParent(parentId) {
    return this.delete(API_ENDPOINTS.parents.delete(parentId))
  }

  /**
   * Get parent's children (students)
   * @param {string} parentId - Parent ID
   * @returns {Promise<Array>} List of children
   */
  async getParentChildren(parentId) {
    return this.get(API_ENDPOINTS.parents.children(parentId))
  }

  /**
   * Link a parent to a student
   * @param {string} parentId - Parent ID
   * @param {string} studentId - Student ID
   * @param {string} relationship - Relationship type (father, mother, guardian, etc.)
   * @returns {Promise<Object>} Link data
   */
  async linkToStudent(parentId, studentId, relationship) {
    return this.post('/api/parents/link-student', {
      parentId,
      studentId,
      relationship,
    })
  }

  /**
   * Unlink a parent from a student
   * @param {string} linkId - Link ID
   * @returns {Promise<void>}
   */
  async unlinkFromStudent(linkId) {
    return this.delete(`/api/parents/links/${linkId}`)
  }

  /**
   * Get child's grades
   * @param {string} studentId - Student ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Student grades
   */
  async getChildGrades(studentId, filters = {}) {
    return this.get(`/api/parents/children/${studentId}/grades`, filters)
  }

  /**
   * Get child's attendance
   * @param {string} studentId - Student ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Attendance records
   */
  async getChildAttendance(studentId, filters = {}) {
    return this.get(`/api/parents/children/${studentId}/attendance`, filters)
  }

  /**
   * Get child's schedule
   * @param {string} studentId - Student ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Class schedule
   */
  async getChildSchedule(studentId, filters = {}) {
    return this.get(`/api/parents/children/${studentId}/schedule`, filters)
  }

  /**
   * Get parent notifications
   * @param {string} parentId - Parent ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Notifications
   */
  async getNotifications(parentId, filters = {}) {
    return this.get(`/api/parents/${parentId}/notifications`, filters)
  }

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   * @returns {Promise<Object>} Updated notification
   */
  async markNotificationRead(notificationId) {
    return this.put(`/api/parents/notifications/${notificationId}/read`)
  }

  /**
   * Send message to school
   * @param {string} parentId - Parent ID
   * @param {Object} messageData - Message data
   * @returns {Promise<Object>} Sent message
   */
  async sendMessage(parentId, messageData) {
    return this.post(`/api/parents/${parentId}/messages`, messageData)
  }

  /**
   * Get parent-teacher meeting requests
   * @param {string} parentId - Parent ID
   * @returns {Promise<Array>} Meeting requests
   */
  async getMeetingRequests(parentId) {
    return this.get(`/api/parents/${parentId}/meetings`)
  }

  /**
   * Request parent-teacher meeting
   * @param {string} parentId - Parent ID
   * @param {Object} meetingData - Meeting details
   * @returns {Promise<Object>} Meeting request
   */
  async requestMeeting(parentId, meetingData) {
    return this.post(`/api/parents/${parentId}/meetings`, meetingData)
  }

  /**
   * Search for parents
   * @param {string} query - Search query
   * @param {Object} filters - Additional filters
   * @returns {Promise<Array>} Matching parents
   */
  async searchParents(query, filters = {}) {
    return this.get(API_ENDPOINTS.parents.list, {
      q: query,
      ...filters,
    })
  }
}

// Export singleton instance
export default new ParentService()
