/**
 * Format Utilities
 *
 * Common formatting functions for displaying data
 */

/**
 * Format full name from first and last name
 * @param {Object} person - Person object with firstName and lastName
 * @returns {string} Formatted full name
 */
export const formatFullName = (person) => {
  if (!person) return ''
  const { firstName = '', lastName = '' } = person
  return `${firstName} ${lastName}`.trim()
}

/**
 * Format name with title prefix
 * @param {Object} person - Person object with firstName, lastName, and title
 * @returns {string} Formatted name with title
 */
export const formatNameWithTitle = (person) => {
  if (!person) return ''
  const { title = '', firstName = '', lastName = '' } = person
  const name = `${firstName} ${lastName}`.trim()
  return title ? `${title} ${name}` : name
}

/**
 * Format address object to string
 * @param {Object} address - Address object
 * @returns {string} Formatted address
 */
export const formatAddress = (address) => {
  if (!address) return ''

  const parts = [
    address.street,
    address.city,
    address.state,
    address.zipCode,
    address.country,
  ].filter(Boolean)

  return parts.join(', ')
}

/**
 * Format phone number for display
 * @param {string} phone - Phone number
 * @returns {string} Formatted phone number
 */
export const formatPhoneNumber = (phone) => {
  if (!phone) return ''

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '')

  // Format based on length
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }

  if (digits.length === 9 && digits.startsWith('0')) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`
  }

  return phone
}

/**
 * Format grade to letter
 * @param {number} grade - Numeric grade
 * @param {Object} scale - Grading scale
 * @returns {string} Letter grade
 */
export const formatGradeToLetter = (grade, scale = null) => {
  const defaultScale = {
    A: { min: 90, max: 100 },
    B: { min: 80, max: 89 },
    C: { min: 70, max: 79 },
    D: { min: 60, max: 69 },
    F: { min: 0, max: 59 },
  }

  const gradingScale = scale || defaultScale

  for (const [letter, range] of Object.entries(gradingScale)) {
    if (grade >= range.min && grade <= range.max) {
      return letter
    }
  }

  return 'F'
}

/**
 * Format grade to GPA
 * @param {number|string} grade - Grade (numeric or letter)
 * @returns {number} GPA value
 */
export const formatGradeToGPA = (grade) => {
  const gpaScale = {
    A: 4.0,
    'B+': 3.5,
    B: 3.0,
    'C+': 2.5,
    C: 2.0,
    'D+': 1.5,
    D: 1.0,
    F: 0.0,
  }

  if (typeof grade === 'string') {
    return gpaScale[grade.toUpperCase()] || 0
  }

  if (typeof grade === 'number') {
    if (grade >= 90) return 4.0
    if (grade >= 80) return 3.0
    if (grade >= 70) return 2.0
    if (grade >= 60) return 1.0
    return 0.0
  }

  return 0
}

/**
 * Format number with commas
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
export const formatNumber = (num) => {
  if (typeof num !== 'number') return ''
  return num.toLocaleString('en-US')
}

/**
 * Format currency
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: 'USD')
 * @returns {string} Formatted currency
 */
export const formatCurrency = (amount, currency = 'USD') => {
  if (typeof amount !== 'number') return ''

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}

/**
 * Format percentage
 * @param {number} value - Value to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted percentage
 */
export const formatPercentage = (value, decimals = 1) => {
  if (typeof value !== 'number') return ''

  return `${value.toFixed(decimals)}%`
}

/**
 * Format file size
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Truncate text to specified length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @param {string} suffix - Suffix to add (default: '...')
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength, suffix = '...') => {
  if (!text || text.length <= maxLength) return text

  return text.slice(0, maxLength - suffix.length) + suffix
}

/**
 * Format gender for display
 * @param {string} gender - Gender code (M/F/O)
 * @returns {string} Formatted gender
 */
export const formatGender = (gender) => {
  const genderMap = {
    M: 'Male',
    F: 'Female',
    O: 'Other',
    male: 'Male',
    female: 'Female',
    other: 'Other',
  }

  return genderMap[gender?.toLowerCase()] || gender || ''
}

/**
 * Format role for display
 * @param {string} role - Role code
 * @returns {string} Formatted role
 */
export const formatRole = (role) => {
  const roleMap = {
    admin: 'Administrator',
    teacher: 'Teacher',
    student: 'Student',
    parent: 'Parent',
    staff: 'Staff Member',
  }

  return roleMap[role?.toLowerCase()] || role || ''
}

/**
 * Format status badge class
 * @param {string} status - Status value
 * @returns {string} CSS class name for status badge
 */
export const getStatusBadgeClass = (status) => {
  const statusMap = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    pending: 'bg-yellow-100 text-yellow-800',
    suspended: 'bg-red-100 text-red-800',
    graduated: 'bg-blue-100 text-blue-800',
    enrolled: 'bg-green-100 text-green-800',
    withdrawn: 'bg-red-100 text-red-800',
  }

  return statusMap[status?.toLowerCase()] || 'bg-gray-100 text-gray-800'
}

export default {
  formatFullName,
  formatNameWithTitle,
  formatAddress,
  formatPhoneNumber,
  formatGradeToLetter,
  formatGradeToGPA,
  formatNumber,
  formatCurrency,
  formatPercentage,
  formatFileSize,
  truncateText,
  formatGender,
  formatRole,
  getStatusBadgeClass,
}
