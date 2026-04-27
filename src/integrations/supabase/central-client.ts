// Separate Supabase client for Central/Admin System with isolated storage
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, getAuthStorageKey } from './config'

// Clear expired tokens for central system
const clearExpiredTokens = () => {
  try {
    const authKey = getAuthStorageKey('central')
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

// Custom storage with separate key for Central System
const centralStorage = {
  getItem: (key: string) => {
    return localStorage.getItem(`central_${key}`)
  },
  setItem: (key: string, value: string) => {
    localStorage.setItem(`central_${key}`, value)
  },
  removeItem: (key: string) => {
    localStorage.removeItem(`central_${key}`)
  },
}

export const centralSupabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: centralStorage,
      storageKey: 'central_auth',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    }
  }
)
