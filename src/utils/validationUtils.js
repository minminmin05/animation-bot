/**
 * Validation Utilities
 *
 * Common validation functions for forms and data
 */

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
export const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

/**
 * Validate Thai phone number
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid
 */
export const isValidThaiPhone = (phone) => {
  const re = /^(\+66|66|0)[0-9]{8,9}$/
  return re.test(phone.replace(/[\s-]/g, ''))
}

/**
 * Validate Thai citizen ID (13 digits)
 * @param {string} id - Citizen ID to validate
 * @returns {boolean} True if valid
 */
export const isValidThaiCitizenId = (id) => {
  // Remove any non-digit characters
  const digits = id.replace(/\D/g, '')

  // Must be exactly 13 digits
  if (digits.length !== 13) return false

  // Check last digit (checksum)
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits[i]) * (13 - i)
  }

  const checksum = (11 - (sum % 11)) % 10
  return checksum === parseInt(digits[12])
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} Validation result with isValid and strength level
 */
export const validatePassword = (password) => {
  if (!password || password.length < 8) {
    return { isValid: false, strength: 'weak', message: 'Password must be at least 8 characters' }
  }

  let strength = 0
  if (password.length >= 8) strength++
  if (password.length >= 12) strength++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++
  if (/[0-9]/.test(password)) strength++
  if (/[^a-zA-Z0-9]/.test(password)) strength++

  const levels = ['very weak', 'weak', 'fair', 'good', 'strong', 'very strong']
  const strengthLevel = levels[strength] || 'very weak'

  return {
    isValid: strength >= 2,
    strength: strengthLevel,
    level: strength,
  }
}

/**
 * Validate student ID format
 * @param {string} studentId - Student ID to validate
 * @returns {boolean} True if valid format
 */
export const isValidStudentId = (studentId) => {
  // Adjust pattern based on your school's student ID format
  const re = /^[A-Z0-9]{5,20}$/
  return re.test(studentId)
}

/**
 * Validate URL
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid
 */
export const isValidUrl = (url) => {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Validate required fields
 * @param {Object} data - Data object to validate
 * @param {Array<string>} requiredFields - Array of required field names
 * @returns {Object} Validation result with isValid and missing fields
 */
export const validateRequired = (data, requiredFields) => {
  const missing = []

  for (const field of requiredFields) {
    if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
      missing.push(field)
    }
  }

  return {
    isValid: missing.length === 0,
    missing,
  }
}

/**
 * Sanitize user input to prevent XSS
 * @param {string} input - Input string to sanitize
 * @returns {string} Sanitized string
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Validate file type
 * @param {File} file - File to validate
 * @param {Array<string>} allowedTypes - Array of allowed MIME types
 * @returns {boolean} True if file type is allowed
 */
export const isValidFileType = (file, allowedTypes) => {
  return allowedTypes.includes(file.type)
}

/**
 * Validate file size
 * @param {File} file - File to validate
 * @param {number} maxSizeMB - Maximum size in MB
 * @returns {boolean} True if file size is within limit
 */
export const isValidFileSize = (file, maxSizeMB) => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  return file.size <= maxSizeBytes
}

/**
 * Validate date range
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @returns {boolean} True if date range is valid
 */
export const isValidDateRange = (startDate, endDate) => {
  const start = new Date(startDate)
  const end = new Date(endDate)

  return start <= end
}

/**
 * Validate grade value
 * @param {number|string} grade - Grade to validate
 * @param {Object} scale - Grading scale with min/max values
 * @returns {boolean} True if grade is within valid range
 */
export const isValidGrade = (grade, scale = { min: 0, max: 100 }) => {
  const numGrade = typeof grade === 'string' ? parseFloat(grade) : grade

  if (isNaN(numGrade)) return false

  return numGrade >= scale.min && numGrade <= scale.max
}

export default {
  isValidEmail,
  isValidThaiPhone,
  isValidThaiCitizenId,
  validatePassword,
  isValidStudentId,
  isValidUrl,
  validateRequired,
  sanitizeInput,
  isValidFileType,
  isValidFileSize,
  isValidDateRange,
  isValidGrade,
}
