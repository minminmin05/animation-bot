// Separate Supabase client for Teacher System with isolated storage
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, getAuthStorageKey } from './config'

// Clear expired tokens for teacher system
const clearExpiredTokens = () => {
  try {
    const authKey = getAuthStorageKey('teacher')
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

// Custom storage with separate key for Teacher System
const teacherStorage = {
  getItem: (key: string) => {
    return localStorage.getItem(`teacher_${key}`)
  },
  setItem: (key: string, value: string) => {
    localStorage.setItem(`teacher_${key}`, value)
  },
  removeItem: (key: string) => {
    localStorage.removeItem(`teacher_${key}`)
  },
}

export const teacherSupabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: teacherStorage,
      storageKey: 'teacher_auth',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    }
  }
)
