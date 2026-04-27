/**
 * Date Utilities
 *
 * Common date manipulation and formatting functions
 * adapted for school management context
 */

import { format, addDays, subDays, differenceInDays, isSameDay, parseISO } from 'date-fns'

/**
 * Format date to readable string
 * @param {Date|string} date - Date to format
 * @param {string} formatString - Format string (default: 'MMM dd, yyyy')
 * @returns {string} Formatted date string
 */
export const formatDate = (date, formatString = 'MMM dd, yyyy') => {
  if (!date) return ''
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, formatString)
}

/**
 * Format date to short string (MM/DD/YYYY)
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatShortDate = (date) => {
  return formatDate(date, 'MM/dd/yyyy')
}

/**
 * Format date to long string (Month DD, YYYY)
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatLongDate = (date) => {
  return formatDate(date, 'MMMM dd, yyyy')
}

/**
 * Format date to time string (HH:mm AM/PM)
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted time string
 */
export const formatTime = (date) => {
  return formatDate(date, 'hh:mm a')
}

/**
 * Format date to date and time string
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date and time string
 */
export const formatDateTime = (date) => {
  return formatDate(date, 'MMM dd, yyyy hh:mm a')
}

/**
 * Check if date is today
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if date is today
 */
export const isToday = (date) => {
  if (!date) return false
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return isSameDay(dateObj, new Date())
}

/**
 * Get academic year range for a given date
 * @param {Date|string} date - Date to check
 * @param {number} startMonth - Month academic year starts (default: 8 = August)
 * @returns {string} Academic year (e.g., "2024-2025")
 */
export const getAcademicYear = (date = new Date(), startMonth = 8) => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  const year = dateObj.getFullYear()
  const month = dateObj.getMonth() + 1

  // If date is before start month, it belongs to previous academic year
  if (month < startMonth) {
    return `${year - 1}-${year}`
  }

  return `${year}-${year + 1}`
}

/**
 * Get current academic term
 * @param {Date|string} date - Date to check
 * @returns {string} Current term ('first', 'second', 'summer')
 */
export const getCurrentTerm = (date = new Date()) => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  const month = dateObj.getMonth() + 1

  // Simple term calculation - adjust based on your school calendar
  if (month >= 8 && month <= 12) return 'first'
  if (month >= 1 && month <= 5) return 'second'
  return 'summer'
}

/**
 * Calculate age from birth date
 * @param {Date|string} birthDate - Birth date
 * @returns {number} Age in years
 */
export const calculateAge = (birthDate) => {
  if (!birthDate) return 0
  const birth = typeof birthDate === 'string' ? parseISO(birthDate) : birthDate
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }

  return age
}

/**
 * Get week start and end dates
 * @param {Date|string} date - Date within the week
 * @returns {Object} Object with startDate and endDate
 */
export const getWeekBounds = (date = new Date()) => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  const day = dateObj.getDay()
  const startDate = subDays(dateObj, day) // Sunday
  const endDate = addDays(startDate, 6) // Saturday

  return { startDate, endDate }
}

/**
 * Get month start and end dates
 * @param {Date|string} date - Date within the month
 * @returns {Object} Object with startDate and endDate
 */
export const getMonthBounds = (date = new Date()) => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  const startDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1)
  const endDate = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0)

  return { startDate, endDate }
}

/**
 * Calculate days between two dates
 * @param {Date|string} date1 - First date
 * @param {Date|string} date2 - Second date
 * @returns {number} Number of days between dates
 */
export const daysBetween = (date1, date2) => {
  const d1 = typeof date1 === 'string' ? parseISO(date1) : date1
  const d2 = typeof date2 === 'string' ? parseISO(date2) : date2
  return Math.abs(differenceInDays(d1, d2))
}

/**
 * Check if date is within range
 * @param {Date|string} date - Date to check
 * @param {Date|string} startDate - Range start
 * @param {Date|string} endDate - Range end
 * @returns {boolean} True if date is within range
 */
export const isDateInRange = (date, startDate, endDate) => {
  const d = typeof date === 'string' ? parseISO(date) : date
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate

  return d >= start && d <= end
}

/**
 * Get school day dates between two dates (excludes weekends)
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @returns {Array<Date>} Array of school day dates
 */
export const getSchoolDays = (startDate, endDate) => {
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate
  const schoolDays = []

  let current = new Date(start)
  while (current <= end) {
    const dayOfWeek = current.getDay()
    // Exclude Saturday (6) and Sunday (0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      schoolDays.push(new Date(current))
    }
    current = addDays(current, 1)
  }

  return schoolDays
}

export default {
  formatDate,
  formatShortDate,
  formatLongDate,
  formatTime,
  formatDateTime,
  isToday,
  getAcademicYear,
  getCurrentTerm,
  calculateAge,
  getWeekBounds,
  getMonthBounds,
  daysBetween,
  isDateInRange,
  getSchoolDays,
}
