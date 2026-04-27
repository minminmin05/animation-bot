/**
 * Base API Service
 *
 * Provides a unified interface for making API requests with proper error handling,
 * authentication, and request/response transformation.
 */

import { SUPABASE_CONFIG } from './config'

/**
 * Custom API Error class
 */
export class APIError extends Error {
  constructor(message, statusCode, data = null) {
    super(message)
    this.name = 'APIError'
    this.statusCode = statusCode
    this.data = data
  }
}

/**
 * Base Service Class
 *
 * All specific API services (students, teachers, parents) extend this class
 * to inherit common functionality like authentication, error handling, and
 * request/response transformation.
 */
class BaseService {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_BASE_URL || '/api'
    this.supabaseUrl = SUPABASE_CONFIG.url
    this.supabaseKey = SUPABASE_CONFIG.anonKey
  }

  /**
   * Get authentication headers
   * @returns {Object} Headers object with auth token
   */
  getAuthHeaders() {
    const token = localStorage.getItem('auth_token')
    const headers = {
      'Content-Type': 'application/json',
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    return headers
  }

  /**
   * Handle API response
   * @param {Response} response - Fetch response object
   * @returns {Promise<any>} Parsed response data
   * @throws {APIError} If response is not ok
   */
  async handleResponse(response) {
    const contentType = response.headers.get('content-type')
    const isJSON = contentType?.includes('application/json')

    if (!response.ok) {
      let errorMessage = 'An error occurred while making the request'

      if (isJSON) {
        const errorData = await response.json()
        errorMessage = errorData.message || errorData.error || errorMessage
        throw new APIError(errorMessage, response.status, errorData)
      }

      throw new APIError(errorMessage, response.status)
    }

    if (isJSON) {
      return response.json()
    }

    return response.text()
  }

  /**
   * Make a GET request
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Query parameters
   * @returns {Promise<any>} Response data
   */
  async get(endpoint, params = {}) {
    const url = new URL(endpoint, window.location.origin)
    Object.keys(params).forEach((key) =>
      url.searchParams.append(key, params[key])
    )

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })

    return this.handleResponse(response)
  }

  /**
   * Make a POST request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body data
   * @returns {Promise<any>} Response data
   */
  async post(endpoint, data = {}) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    })

    return this.handleResponse(response)
  }

  /**
   * Make a PUT request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body data
   * @returns {Promise<any>} Response data
   */
  async put(endpoint, data = {}) {
    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    })

    return this.handleResponse(response)
  }

  /**
   * Make a PATCH request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body data
   * @returns {Promise<any>} Response data
   */
  async patch(endpoint, data = {}) {
    const response = await fetch(endpoint, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    })

    return this.handleResponse(response)
  }

  /**
   * Make a DELETE request
   * @param {string} endpoint - API endpoint
   * @returns {Promise<any>} Response data
   */
  async delete(endpoint) {
    const response = await fetch(endpoint, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    })

    return this.handleResponse(response)
  }

  /**
   * Upload a file
   * @param {string} endpoint - API endpoint
   * @param {FormData} formData - Form data with file
   * @returns {Promise<any>} Response data
   */
  async upload(endpoint, formData) {
    const token = localStorage.getItem('auth_token')
    const headers = {}

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: formData,
    })

    return this.handleResponse(response)
  }
}

export default BaseService
