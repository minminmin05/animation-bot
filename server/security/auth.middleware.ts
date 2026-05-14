import { Request, Response, NextFunction } from 'express'
import { createClient } from '@supabase/supabase-js'

let supabaseClient: any = null

function getSupabase() {
  if (!supabaseClient) {
    supabaseClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )
  }
  return supabaseClient
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    role?: string
    email?: string
  }
}

/**
 * Middleware to authenticate requests using Supabase JWT
 */
export async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[Auth Middleware] ❌ No Bearer token found')
    return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' })
  }

  const token = authHeader.substring(7)

  try {
    const supabase = getSupabase()
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      console.error('[Auth Middleware] ❌ Invalid token:', error?.message)
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token' })
    }

    // Get user role from users table
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    req.user = {
      id: user.id,
      email: user.email,
      role: userData?.role || 'student'
    }

    console.log(`[Auth Middleware] ✅ Authenticated: ${user.email} (${req.user.role})`)
    next()
  } catch (error) {
    console.error('[Auth Middleware] ❌ Auth error:', error)
    res.status(401).json({ error: 'Unauthorized', message: 'Authentication failed' })
  }
}
