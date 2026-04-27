/**
 * useParents Hook
 *
 * Custom hook for parent management operations
 */

import { useState, useEffect, useCallback } from 'react'
import ParentService from '../services/api/parentService'

/**
 * useParents Hook
 *
 * @param {Object} options - Options for fetching parents
 * @returns {Object} Parents data and operations
 */
export const useParents = (options = {}) => {
  const [parents, setParents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  /**
   * Fetch parents with optional filters
   */
  const fetchParents = useCallback(async (filters = {}) => {
    setLoading(true)
    setError(null)

    try {
      const data = await ParentService.getParents({
        ...options,
        ...filters,
      })
      setParents(data || [])
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [options])

  /**
   * Get a single parent by ID
   */
  const getParent = useCallback(async (parentId) => {
    setLoading(true)
    setError(null)

    try {
      const data = await ParentService.getParent(parentId)
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Create a new parent
   */
  const createParent = useCallback(async (parentData) => {
    setLoading(true)
    setError(null)

    try {
      const data = await ParentService.createParent(parentData)
      setParents((prev) => [...prev, data])
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Update a parent
   */
  const updateParent = useCallback(async (parentId, parentData) => {
    setLoading(true)
    setError(null)

    try {
      const data = await ParentService.updateParent(parentId, parentData)
      setParents((prev) =>
        prev.map((p) => (p.id === parentId ? data : p))
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
   * Delete a parent
   */
  const deleteParent = useCallback(async (parentId) => {
    setLoading(true)
    setError(null)

    try {
      await ParentService.deleteParent(parentId)
      setParents((prev) => prev.filter((p) => p.id !== parentId))
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Get parent's children
   */
  const getParentChildren = useCallback(async (parentId) => {
    setLoading(true)
    setError(null)

    try {
      const data = await ParentService.getParentChildren(parentId)
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Link parent to student
   */
  const linkToStudent = useCallback(async (parentId, studentId, relationship) => {
    setLoading(true)
    setError(null)

    try {
      const data = await ParentService.linkToStudent(parentId, studentId, relationship)
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch parents on mount if options are provided
  useEffect(() => {
    if (Object.keys(options).length > 0) {
      fetchParents()
    }
  }, [fetchParents])

  return {
    parents,
    loading,
    error,
    fetchParents,
    getParent,
    createParent,
    updateParent,
    deleteParent,
    getParentChildren,
    linkToStudent,
  }
}

export default useParents
