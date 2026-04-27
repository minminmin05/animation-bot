// Separate Supabase client for Student System with isolated storage
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, getAuthStorageKey } from './config'

// Clear expired tokens for student system
const clearExpiredTokens = () => {
  try {
    const authKey = getAuthStorageKey('student')
    const stored = localStorage.getItem(authKey)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (parsed?.expires_at && parsed.expires_at < Date.now() / 1000) {
        localStorage.removeItem(authKey)
      }
    }
  } catch (e) {
    // Ignore parsing errors
  }
}

clearExpiredTokens()

// Custom storage with separate key for Student System
const studentStorage = {
  getItem: (key: string) => {
    return localStorage.getItem(`student_${key}`)
  },
  setItem: (key: string, value: string) => {
    localStorage.setItem(`student_${key}`, value)
  },
  removeItem: (key: string) => {
    localStorage.removeItem(`student_${key}`)
  },
}

// Student Supabase client with isolated storage
export const studentSupabase = createClient<any>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: studentStorage,
      storageKey: 'student_auth',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    }
  }
)
