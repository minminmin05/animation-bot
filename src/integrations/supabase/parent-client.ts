// Separate Supabase client for Parent System with isolated storage
// Features: Persistent session (no auto-expiry until explicit logout)
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config'

// Parent storage keys
const PARENT_AUTH_KEY = 'parent_auth_token'
const PARENT_REMEMBER_KEY = 'parent_remember_credentials'

/**
 * Get remember me preference
 */
export const getRememberMePreference = (): boolean => {
  try {
    return localStorage.getItem('parent_remember_me') === 'true'
  } catch {
    return false
  }
}

/**
 * Set remember me preference
 */
export const setRememberMePreference = (remember: boolean) => {
  try {
    localStorage.setItem('parent_remember_me', remember ? 'true' : 'false')
    if (!remember) {
      // Clear saved credentials if unchecked
      localStorage.removeItem(PARENT_REMEMBER_KEY)
    }
  } catch {
    console.error('Failed to set remember me preference')
  }
}

/**
 * Save login credentials (for remember me feature)
 */
export const saveParentCredentials = (
  orgId: string,
  phone: string,
  idCard: string,
  birthdate: string
) => {
  try {
    const credentials = {
      orgId,
      phone,
      idCard,
      birthdate,
      savedAt: Date.now()
    }
    localStorage.setItem(PARENT_REMEMBER_KEY, JSON.stringify(credentials))
  } catch {
    console.error('Failed to save credentials')
  }
}

/**
 * Get saved login credentials
 */
export const getSavedParentCredentials = (): {
  orgId: string
  phone: string
  idCard: string
  birthdate: string
} | null => {
  try {
    const saved = localStorage.getItem(PARENT_REMEMBER_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch {
    // Ignore parsing errors
  }
  return null
}

/**
 * Clear saved credentials
 */
export const clearParentCredentials = () => {
  try {
    localStorage.removeItem(PARENT_REMEMBER_KEY)
    localStorage.removeItem('parent_remember_me')
  } catch {
    console.error('Failed to clear credentials')
  }
}

// Custom storage with separate key for Parent System
// Sessions persist indefinitely until explicit logout
const parentStorage = {
  getItem: (key: string) => {
    try {
      return localStorage.getItem(`parent_${key}`)
    } catch {
      return null
    }
  },
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(`parent_${key}`, value)
    } catch {
      console.error('Failed to save to storage')
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(`parent_${key}`)
    } catch {
      console.error('Failed to remove from storage')
    }
  },
}

// Parent Supabase client with persistent session
export const parentSupabase = createClient<any>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: parentStorage,
      storageKey: 'parent_auth',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false, // Disable for mobile apps
    }
  }
)

/**
 * Check if parent has valid session
 */
export const hasValidParentSession = async (): Promise<boolean> => {
  try {
    const { data: { session } } = await parentSupabase.auth.getSession()
    return !!session?.user
  } catch {
    return false
  }
}

/**
 * Sign out and clear all parent-related data
 */
export const signOutParent = async () => {
  try {
    await parentSupabase.auth.signOut()
    // Clear parent org ID
    localStorage.removeItem('parent_org_id')
    // Keep remember me credentials if preference is set
    if (!getRememberMePreference()) {
      clearParentCredentials()
    }
  } catch (error) {
    console.error('Error signing out:', error)
  }
}
