/**
 * useStudents Hook
 *
 * Custom hook for student management operations
 */

import { useState, useEffect, useCallback } from 'react'
import StudentService from '../services/api/studentService'

/**
 * useStudents Hook
 *
 * @param {Object} options - Options for fetching students
 * @returns {Object} Students data and operations
 */
export const useStudents = (options = {}) => {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  /**
   * Fetch students with optional filters
   */
  const fetchStudents = useCallback(async (filters = {}) => {
    setLoading(true)
    setError(null)

    try {
      const data = await StudentService.getStudents({
        ...options,
        ...filters,
      })
      setStudents(data || [])
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [options])

  /**
   * Get a single student by ID
   */
  const getStudent = useCallback(async (studentId) => {
    setLoading(true)
    setError(null)

    try {
      const data = await StudentService.getStudent(studentId)
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Create a new student
   */
  const createStudent = useCallback(async (studentData) => {
    setLoading(true)
    setError(null)

    try {
      const data = await StudentService.createStudent(studentData)
      setStudents((prev) => [...prev, data])
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Update a student
   */
  const updateStudent = useCallback(async (studentId, studentData) => {
    setLoading(true)
    setError(null)

    try {
      const data = await StudentService.updateStudent(studentId, studentData)
      setStudents((prev) =>
        prev.map((s) => (s.id === studentId ? data : s))
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
   * Delete a student
   */
  const deleteStudent = useCallback(async (studentId) => {
    setLoading(true)
    setError(null)

    try {
      await StudentService.deleteStudent(studentId)
      setStudents((prev) => prev.filter((s) => s.id !== studentId))
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Search students
   */
  const searchStudents = useCallback(async (query) => {
    setLoading(true)
    setError(null)

    try {
      const data = await StudentService.searchStudents(query)
      setStudents(data || [])
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch students on mount if options are provided
  useEffect(() => {
    if (Object.keys(options).length > 0) {
      fetchStudents()
    }
  }, [fetchStudents])

  return {
    students,
    loading,
    error,
    fetchStudents,
    getStudent,
    createStudent,
    updateStudent,
    deleteStudent,
    searchStudents,
  }
}

export default useStudents
