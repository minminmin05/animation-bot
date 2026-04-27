/**
 * useTeachers Hook
 *
 * Custom hook for teacher management operations
 */

import { useState, useEffect, useCallback } from 'react'
import TeacherService from '../services/api/teacherService'

/**
 * useTeachers Hook
 *
 * @param {Object} options - Options for fetching teachers
 * @returns {Object} Teachers data and operations
 */
export const useTeachers = (options = {}) => {
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  /**
   * Fetch teachers with optional filters
   */
  const fetchTeachers = useCallback(async (filters = {}) => {
    setLoading(true)
    setError(null)

    try {
      const data = await TeacherService.getTeachers({
        ...options,
        ...filters,
      })
      setTeachers(data || [])
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [options])

  /**
   * Get a single teacher by ID
   */
  const getTeacher = useCallback(async (teacherId) => {
    setLoading(true)
    setError(null)

    try {
      const data = await TeacherService.getTeacher(teacherId)
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Create a new teacher
   */
  const createTeacher = useCallback(async (teacherData) => {
    setLoading(true)
    setError(null)

    try {
      const data = await TeacherService.createTeacher(teacherData)
      setTeachers((prev) => [...prev, data])
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Update a teacher
   */
  const updateTeacher = useCallback(async (teacherId, teacherData) => {
    setLoading(true)
    setError(null)

    try {
      const data = await TeacherService.updateTeacher(teacherId, teacherData)
      setTeachers((prev) =>
        prev.map((t) => (t.id === teacherId ? data : t))
      )
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Delete a teacher
   */
  const deleteTeacher = useCallback(async (teacherId) => {
    setLoading(true)
    setError(null)

    try {
      await TeacherService.deleteTeacher(teacherId)
      setTeachers((prev) => prev.filter((t) => t.id !== teacherId))
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Search teachers
   */
  const searchTeachers = useCallback(async (query) => {
    setLoading(true)
    setError(null)

    try {
      const data = await TeacherService.searchTeachers(query)
      setTeachers(data || [])
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch teachers on mount if options are provided
  useEffect(() => {
    if (Object.keys(options).length > 0) {
      fetchTeachers()
    }
  }, [fetchTeachers])

  return {
    teachers,
    loading,
    error,
    fetchTeachers,
    getTeacher,
    createTeacher,
    updateTeacher,
    deleteTeacher,
    searchTeachers,
  }
}

export default useTeachers
