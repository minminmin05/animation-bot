/**
 * Authentication Service
 *
 * Handles all authentication operations including:
 * - Login/logout
 * - User registration
 * - Password reset
 * - Token management
 */

import BaseService from './baseService'
import { API_ENDPOINTS, SUPABASE_CONFIG } from './config'

class AuthService extends BaseService {
  constructor() {
    super()
    // Initialize Supabase client if available
    if (SUPABASE_CONFIG.url !== 'YOUR_SUPABASE_URL_HERE') {
      this.initSupabase()
    }
  }

  /**
   * Initialize Supabase client
   */
  async initSupabase() {
    try {
      const { createClient } = await import('@supabase/supabase-js')
      this.supabase = createClient(
        SUPABASE_CONFIG.url,
        SUPABASE_CONFIG.anonKey
      )
    } catch (error) {
      console.error('Failed to initialize Supabase:', error)
    }
  }

  /**
   * Login with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} Login result with user data and token
   */
  async login(email, password) {
    // Try Supabase first if available
    if (this.supabase) {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        throw new APIError(error.message, 400, error)
      }

      // Store token in localStorage
      if (data.session?.access_token) {
        localStorage.setItem('auth_token', data.session.access_token)
      }

      return {
        user: data.user,
        session: data.session,
        token: data.session?.access_token,
      }
    }

    // Fallback to API endpoint
    return this.post(API_ENDPOINTS.auth.login, { email, password })
  }

  /**
   * Logout current user
   * @returns {Promise<void>}
   */
  async logout() {
    // Try Supabase first if available
    if (this.supabase) {
      await this.supabase.auth.signOut()
    }

    // Clear token from localStorage
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_data')

    // Fallback to API endpoint
    try {
      await this.post(API_ENDPOINTS.auth.logout)
    } catch (error) {
      console.error('Logout API call failed:', error)
    }
  }

  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} Registration result
   */
  async register(userData) {
    // Try Supabase first if available
    if (this.supabase) {
      const { data, error } = await this.supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            first_name: userData.firstName,
            last_name: userData.lastName,
            role: userData.role,
          },
        },
      })

      if (error) {
        throw new APIError(error.message, 400, error)
      }

      return {
        user: data.user,
        session: data.session,
      }
    }

    // Fallback to API endpoint
    return this.post(API_ENDPOINTS.auth.register, userData)
  }

  /**
   * Get current user
   * @returns {Promise<Object>} Current user data
   */
  async getCurrentUser() {
    // Try Supabase first if available
    if (this.supabase) {
      const { data, error } = await this.supabase.auth.getUser()

      if (error) {
        throw new APIError(error.message, 400, error)
      }

      return data.user
    }

    // Fallback to stored user data
    const userData = localStorage.getItem('user_data')
    if (userData) {
      return JSON.parse(userData)
    }

    throw new APIError('No user found', 404)
  }

  /**
   * Reset password
   * @param {string} email - User email
   * @returns {Promise<void>}
   */
  async resetPassword(email) {
    // Try Supabase first if available
    if (this.supabase) {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email)

      if (error) {
        throw new APIError(error.message, 400, error)
      }

      return { success: true }
    }

    // Fallback to API endpoint
    return this.post(API_ENDPOINTS.auth.resetPassword, { email })
  }

  /**
   * Update password
   * @param {string} newPassword - New password
   * @returns {Promise<void>}
   */
  async updatePassword(newPassword) {
    // Try Supabase first if available
    if (this.supabase) {
      const { error } = await this.supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) {
        throw new APIError(error.message, 400, error)
      }

      return { success: true }
    }

    // Fallback to API endpoint
    return this.put('/api/auth/password', { newPassword })
  }

  /**
   * Refresh authentication token
   * @returns {Promise<Object>} New token data
   */
  async refreshToken() {
    // Try Supabase first if available
    if (this.supabase) {
      const { data, error } = await this.supabase.auth.refreshSession()

      if (error) {
        throw new APIError(error.message, 400, error)
      }

      // Store new token
      if (data.session?.access_token) {
        localStorage.setItem('auth_token', data.session.access_token)
      }

      return {
        token: data.session?.access_token,
        user: data.user,
      }
    }

    // Fallback to API endpoint
    return this.post(API_ENDPOINTS.auth.refreshToken)
  }

  /**
   * Check if user is authenticated
   * @returns {boolean} Authentication status
   */
  isAuthenticated() {
    return !!localStorage.getItem('auth_token')
  }

  /**
   * Get user role from stored data
   * @returns {string|null} User role
   */
  getUserRole() {
    const userData = localStorage.getItem('user_data')
    if (userData) {
      const user = JSON.parse(userData)
      return user.role || null
    }
    return null
  }
}

// Export singleton instance
export default new AuthService()
