/**
 * API Configuration for School Management System
 *
 * IMPORTANT: Replace the placeholder values below with your actual API credentials
 * before deploying to production.
 *
 * For Supabase: Update .env file with your SUPABASE_URL and SUPABASE_ANON_KEY
 * For external APIs: Add your API keys below
 */

// ============================================
// SUPABASE CONFIGURATION
// ============================================
// These values are loaded from .env file
// Create a .env file in the project root with:
//   VITE_SUPABASE_URL=your_supabase_project_url
//   VITE_SUPabase_ANON_KEY=your_supabase_anon_key

export const SUPABASE_CONFIG = {
  url: import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL_HERE',
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY_HERE',
}

// ============================================
// EXTERNAL API CONFIGURATIONS
// ============================================

// Email Service (e.g., SendGrid, Mailgun)
export const EMAIL_CONFIG = {
  apiKey: 'YOUR_EMAIL_API_KEY_HERE',
  fromEmail: 'noreply@school.edu',
  fromName: 'School Management System',
}

// SMS Service (e.g., Twilio)
export const SMS_CONFIG = {
  apiKey: 'YOUR_SMS_API_KEY_HERE',
  fromNumber: 'YOUR_TWILIO_PHONE_NUMBER_HERE',
}

// Payment Gateway (e.g., Stripe)
export const PAYMENT_CONFIG = {
  publicKey: 'YOUR_PAYMENT_PUBLIC_KEY_HERE',
  secretKey: 'YOUR_PAYMENT_SECRET_KEY_HERE', // Only use server-side
}

// Storage Service (e.g., AWS S3, Cloudinary)
export const STORAGE_CONFIG = {
  bucketName: 'YOUR_STORAGE_BUCKET_NAME_HERE',
  region: 'YOUR_STORAGE_REGION_HERE',
  accessKeyId: 'YOUR_STORAGE_ACCESS_KEY_ID_HERE',
  secretAccessKey: 'YOUR_STORAGE_SECRET_ACCESS_KEY_HERE', // Only use server-side
}

// Push Notification Service (e.g., Firebase Cloud Messaging)
export const NOTIFICATION_CONFIG = {
  apiKey: 'YOUR_FCM_API_KEY_HERE',
  authDomain: 'YOUR_FCM_AUTH_DOMAIN_HERE',
  projectId: 'YOUR_FCM_PROJECT_ID_HERE',
  messagingSenderId: 'YOUR_FCM_MESSAGING_SENDER_ID_HERE',
  appId: 'YOUR_FCM_APP_ID_HERE',
}

// ============================================
// SCHOOL CONFIGURATION
// ============================================

export const SCHOOL_CONFIG = {
  name: 'My School',
  domain: 'myschool.edu',
  academicYear: {
    current: '2024-2025',
    startMonth: 8, // August
    endMonth: 7, // July
  },
  gradingScale: {
    A: { min: 90, max: 100, gpa: 4.0 },
    B: { min: 80, max: 89, gpa: 3.0 },
    C: { min: 70, max: 79, gpa: 2.0 },
    D: { min: 60, max: 69, gpa: 1.0 },
    F: { min: 0, max: 59, gpa: 0.0 },
  },
}

// ============================================
// API ENDPOINTS
// ============================================

export const API_ENDPOINTS = {
  // Authentication
  auth: {
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    register: '/api/auth/register',
    refreshToken: '/api/auth/refresh',
    resetPassword: '/api/auth/reset-password',
  },

  // Students
  students: {
    list: '/api/students',
    create: '/api/students',
    update: (id) => `/api/students/${id}`,
    delete: (id) => `/api/students/${id}`,
    detail: (id) => `/api/students/${id}`,
    grades: (id) => `/api/students/${id}/grades`,
    attendance: (id) => `/api/students/${id}/attendance`,
    schedule: (id) => `/api/students/${id}/schedule`,
  },

  // Teachers
  teachers: {
    list: '/api/teachers',
    create: '/api/teachers',
    update: (id) => `/api/teachers/${id}`,
    delete: (id) => `/api/teachers/${id}`,
    detail: (id) => `/api/teachers/${id}`,
    classes: (id) => `/api/teachers/${id}/classes`,
    assignments: (id) => `/api/teachers/${id}/assignments`,
  },

  // Parents
  parents: {
    list: '/api/parents',
    create: '/api/parents',
    update: (id) => `/api/parents/${id}`,
    delete: (id) => `/api/parents/${id}`,
    detail: (id) => `/api/parents/${id}`,
    children: (id) => `/api/parents/${id}/children`,
  },

  // Classes
  classes: {
    list: '/api/classes',
    create: '/api/classes',
    update: (id) => `/api/classes/${id}`,
    delete: (id) => `/api/classes/${id}`,
    detail: (id) => `/api/classes/${id}`,
    students: (id) => `/api/classes/${id}/students`,
    subjects: (id) => `/api/classes/${id}/subjects`,
    schedule: (id) => `/api/classes/${id}/schedule`,
  },

  // Subjects
  subjects: {
    list: '/api/subjects',
    create: '/api/subjects',
    update: (id) => `/api/subjects/${id}`,
    delete: (id) => `/api/subjects/${id}`,
    detail: (id) => `/api/subjects/${id}`,
  },

  // Attendance
  attendance: {
    mark: '/api/attendance/mark',
    report: '/api/attendance/report',
    student: (studentId) => `/api/attendance/student/${studentId}`,
    class: (classId) => `/api/attendance/class/${classId}`,
  },

  // Grades
  grades: {
    submit: '/api/grades/submit',
    update: '/api/grades/update',
    studentReport: (studentId) => `/api/grades/report/${studentId}`,
    classReport: (classId) => `/api/grades/class/${classId}`,
  },

  // Announcements
  announcements: {
    list: '/api/announcements',
    create: '/api/announcements',
    update: (id) => `/api/announcements/${id}`,
    delete: (id) => `/api/announcements/${id}`,
  },
}

// ============================================
// FEATURE FLAGS
// ============================================

export const FEATURES = {
  // Enable/disable features
  attendance: true,
  grading: true,
  scheduling: true,
  announcements: true,
  parentPortal: true,
  teacherPortal: true,
  studentPortal: true,
  smsNotifications: false, // Requires SMS_CONFIG setup
  emailNotifications: true, // Requires EMAIL_CONFIG setup
  paymentCollection: false, // Requires PAYMENT_CONFIG setup
}

// ============================================
// VALIDATION
// ============================================

/**
 * Validate that required configuration is present
 * Call this during app initialization to ensure config is valid
 */
export const validateConfig = () => {
  const errors = []

  // Check Supabase config
  if (SUPABASE_CONFIG.url === 'YOUR_SUPABASE_URL_HERE') {
    errors.push('SUPABASE_URL is not configured. Please set VITE_SUPABASE_URL in .env file')
  }
  if (SUPABASE_CONFIG.anonKey === 'YOUR_SUPABASE_ANON_KEY_HERE') {
    errors.push('SUPABASE_ANON_KEY is not configured. Please set VITE_SUPABASE_ANON_KEY in .env file')
  }

  if (errors.length > 0) {
    console.error('Configuration Errors:', errors)
    return false
  }

  return true
}

export default {
  SUPABASE_CONFIG,
  EMAIL_CONFIG,
  SMS_CONFIG,
  PAYMENT_CONFIG,
  STORAGE_CONFIG,
  NOTIFICATION_CONFIG,
  SCHOOL_CONFIG,
  API_ENDPOINTS,
  FEATURES,
  validateConfig,
}
