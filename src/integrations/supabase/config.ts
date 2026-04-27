// Supabase configuration - single source of truth for URL and Key
// All client files should import from this file
// Supports both local development and production

// Read from environment variables (supports .env and .env.local)
// IMPORTANT: Replace these placeholders with your actual Supabase credentials
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "YOUR_SUPABASE_URL_HERE"
export const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "YOUR_SUPABASE_ANON_KEY_HERE"

// Helper to generate auth storage key
export const getAuthStorageKey = (prefix: string) => {
  let projectRef: string

  if (SUPABASE_URL.includes('127.0.0.1') || SUPABASE_URL.includes('localhost')) {
    projectRef = 'local'
  } else {
    // Extract project ref from URL or use default
    try {
      const url = new URL(SUPABASE_URL)
      const parts = url.hostname.split('.')
      projectRef = parts[0] || 'school'
    } catch {
      projectRef = 'school'
    }
  }

  return `${prefix}_sb-${projectRef}-auth-token`
}

// Helper to get Edge Functions URL
export const getEdgeFunctionsUrl = () => {
  return `${SUPABASE_URL}/functions/v1`
}

// Log current environment (only in development)
if (import.meta.env.DEV) {
  console.log('🔧 Supabase Config:', {
    url: SUPABASE_URL,
    isLocal: SUPABASE_URL.includes('127.0.0.1') || SUPABASE_URL.includes('localhost'),
    functionsUrl: getEdgeFunctionsUrl()
  })
}
