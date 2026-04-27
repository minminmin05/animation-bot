/**
 * useAuth Hook
 *
 * Custom hook for authentication state and operations
 */

import { useState, useEffect, useContext, createContext } from 'react'
import AuthService from '../services/api/authService'

const AuthContext = createContext(null)

/**
 * Auth Provider Component
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Check authentication status on mount
  useEffect(() => {
    checkAuth()
  }, [])

  /**
   * Check if user is authenticated
   */
  const checkAuth = async () => {
    try {
      if (AuthService.isAuthenticated()) {
        const userData = await AuthService.getCurrentUser()
        setUser(userData)
        setIsAuthenticated(true)

        // Store user data for easy access
        localStorage.setItem('user_data', JSON.stringify(userData))
      } else {
        setUser(null)
        setIsAuthenticated(false)
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      setUser(null)
      setIsAuthenticated(false)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Login function
   */
  const login = async (email, password) => {
    try {
      const result = await AuthService.login(email, password)

      if (result.user) {
        setUser(result.user)
        setIsAuthenticated(true)
        localStorage.setItem('user_data', JSON.stringify(result.user))
      }

      return result
    } catch (error) {
      throw error
    }
  }

  /**
   * Logout function
   */
  const logout = async () => {
    try {
      await AuthService.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setUser(null)
      setIsAuthenticated(false)
      localStorage.removeItem('user_data')
    }
  }

  /**
   * Register function
   */
  const register = async (userData) => {
    try {
      const result = await AuthService.register(userData)

      if (result.user) {
        setUser(result.user)
        setIsAuthenticated(true)
        localStorage.setItem('user_data', JSON.stringify(result.user))
      }

      return result
    } catch (error) {
      throw error
    }
  }

  /**
   * Check if user has specific role
   */
  const hasRole = (role) => {
    if (!user) return false
    const userRole = user.role || user.user_metadata?.role
    return userRole === role
  }

  /**
   * Check if user has any of the specified roles
   */
  const hasAnyRole = (roles) => {
    if (!user) return false
    const userRole = user.role || user.user_metadata?.role
    return roles.includes(userRole)
  }

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
    register,
    checkAuth,
    hasRole,
    hasAnyRole,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * useAuth Hook
 *
 * Usage:
 *   const { user, login, logout, hasRole } = useAuth()
 */
export const useAuth = () => {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}

export default useAuth
