import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

// Valid roles
const VALID_ROLES = ['student', 'teacher', 'parent', 'admin'] as const
type ValidRole = typeof VALID_ROLES[number]

// Environment variables
const supabaseUrl = Deno.env.get('PROJECT_URL')!
const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY')!

// Helper function to safely extract string value
function getString(value: unknown, fieldName: string): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') return value
  console.warn(`Field ${fieldName} is not a string, got type: ${typeof value}`)
  return null
}

// Detailed logging helper
function logStep(step: string, data?: Record<string, unknown>) {
  console.log(`[STEP] ${step}`, data ? JSON.stringify(data) : '')
}

// Detailed error logging helper
function logError(step: string, error: unknown) {
  console.error(`[ERROR] ${step}:`, JSON.stringify({
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    fullError: error
  }))
}

serve(async (req) => {
  logStep('Function invoked', { method: req.method, url: req.url })

  // Handle OPTIONS preflight request
  if (req.method === 'OPTIONS') {
    logStep('Handling OPTIONS preflight')
    return new Response('ok', { headers: corsHeaders })
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    logStep('Method not allowed', { method: req.method })
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  let email: string
  let password: string
  let fullName: string
  let role: ValidRole

  try {
    // Parse request body with error handling
    let body: unknown
    try {
      logStep('Parsing request body')
      body = await req.json()
      logStep('Request body parsed', { bodyKeys: Object.keys(body as Record<string, unknown>) })
    } catch (jsonError) {
      logError('JSON Parse Error', jsonError)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid JSON in request body',
          details: jsonError instanceof Error ? jsonError.message : String(jsonError)
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate that body is an object
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      logStep('Invalid body type', { type: typeof body, isArray: Array.isArray(body) })
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Request body must be a valid object'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = body as Record<string, unknown>

    // Extract and validate email
    const rawEmail = getString(data.email, 'email')
    if (!rawEmail) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    email = rawEmail.trim().toLowerCase()
    logStep('Email validated', { email })

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract and validate password
    const rawPassword = getString(data.password, 'password')
    if (!rawPassword) {
      return new Response(
        JSON.stringify({ success: false, error: 'Password is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    password = rawPassword.trim()
    logStep('Password validated', { length: password.length })

    // Validate password length
    if (password.length < 6) {
      return new Response(
        JSON.stringify({ success: false, error: 'Password must be at least 6 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract and validate fullName
    const rawFullName = getString(data.fullName, 'fullName')
    if (!rawFullName || !rawFullName.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Full name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    fullName = rawFullName.trim()
    logStep('Full name validated', { fullName })

    // Extract and validate role
    const rawRole = getString(data.role, 'role')
    if (!rawRole) {
      return new Response(
        JSON.stringify({ success: false, error: 'Role is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Trim and validate role
    const trimmedRole = rawRole.trim() as ValidRole
    if (!VALID_ROLES.includes(trimmedRole)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    role = trimmedRole
    logStep('Role validated', { role })

    logStep('Request validation complete', { email, fullName, role })

    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      logStep('Missing authorization header')
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized - Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract token (handle both 'Bearer token' and just 'token' formats)
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()
    if (!token) {
      logStep('Invalid token format')
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized - Invalid token format' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    logStep('Token extracted', { tokenLength: token.length })

    // Create Supabase client with service role
    logStep('Creating Supabase client with service role')
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Verify user token
    logStep('Verifying admin token')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError) {
      logError('Auth verification error', authError)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid authentication token',
          details: authError.message
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!user) {
      logStep('User not found from token')
      return new Response(
        JSON.stringify({ success: false, error: 'User not found or token expired' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    logStep('Admin verified', { userId: user.id, userEmail: user.email })

    // Check if user is admin
    logStep('Checking admin permissions')
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (userError) {
      logError('Database query error (admin check)', userError)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Database error while checking user permissions',
          details: userError.message,
          code: userError.code,
          hint: userError.hint
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!userData || userData.role !== 'admin') {
      logStep('Unauthorized user creation attempt', { userId: user.id, role: userData?.role })
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Admin access required',
          details: `Current role: ${userData?.role || 'none'}`
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    logStep('Admin permission confirmed')

    // Check if user already exists in public.users
    logStep('Checking if user already exists', { email })
    const { data: existingUser, error: existingCheckError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existingCheckError) {
      logError('Error checking existing user', existingCheckError)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Database error while checking for existing user',
          details: existingCheckError.message
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (existingUser) {
      logStep('User already exists', { existingId: existingUser.id })
      return new Response(
        JSON.stringify({
          success: false,
          error: 'A user with this email already exists',
          details: `Existing user ID: ${existingUser.id}`
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    logStep('No existing user found, proceeding with creation')

    // ============================================================
    // CRITICAL STEP: Create auth user using Supabase Admin API
    // ============================================================
    logStep('BEFORE: Creating auth user via admin API', {
      email,
      role,
      user_metadata: { full_name: fullName, role }
    })

    const { data: newUserData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: role
      }
    })

    logStep('AFTER: Auth admin API call completed', {
      success: !createError,
      hasUserData: !!newUserData,
      hasUser: !!newUserData?.user,
      userId: newUserData?.user?.id
    })

    if (createError) {
      logError('Auth user creation error', createError)
      const errorMessage = createError.message || ''
      const errorDetails = {
        message: errorMessage,
        status: createError.status,
        name: createError.name
      }

      // Handle specific error messages
      if (errorMessage.includes('already') ||
          errorMessage.includes('duplicate') ||
          errorMessage.includes('exists') ||
          errorMessage.includes('unique')) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'A user with this email already exists',
            details: errorDetails
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to create user: ' + errorMessage,
          details: errorDetails
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!newUserData?.user) {
      logError('No user data returned from auth API', newUserData)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to create user - no data returned from auth API',
          details: { receivedData: newUserData }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    logStep('Auth user created successfully', {
      id: newUserData.user.id,
      email: newUserData.user.email,
      aud: newUserData.user.aud,
      role: newUserData.user.role,
      metadata: newUserData.user.user_metadata
    })

    // ============================================================
    // VERIFY: Check if trigger created entry in public.users
    // ============================================================
    logStep('BEFORE: Verifying trigger created public.users entry')

    // Wait a moment for trigger to complete
    await new Promise(resolve => setTimeout(resolve, 500))

    const { data: verifiedUser, error: verifyError } = await supabase
      .from('users')
      .select('*')
      .eq('id', newUserData.user.id)
      .maybeSingle()

    logStep('AFTER: public.users verification', {
      found: !!verifiedUser,
      verifyError: verifyError?.message
    })

    if (verifyError) {
      logError('Error verifying public.users entry', verifyError)
    }

    if (!verifiedUser) {
      logStep('WARNING: Trigger did not create public.users entry!', {
        authUserId: newUserData.user.id,
        email
      })

      // Manual fallback: Create public.users entry directly
      logStep('ATTEMPTING MANUAL FALLBACK: Creating public.users entry')
      const { error: manualInsertError } = await supabase
        .from('users')
        .insert({
          id: newUserData.user.id,
          email: email,
          role: role,
          full_name: fullName
        })

      if (manualInsertError) {
        logError('Manual public.users insert failed', manualInsertError)
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Auth user created but failed to create profile entry',
            details: {
              authUserId: newUserData.user.id,
              profileError: manualInsertError.message,
              code: manualInsertError.code,
              hint: manualInsertError.hint,
              message: 'The trigger did not create the public.users entry. Manual insert also failed. Check RLS policies for users table.'
            }
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      logStep('Manual public.users entry created successfully')
    } else {
      logStep('Trigger successfully created public.users entry', verifiedUser)
    }

    // ============================================================
    // VERIFY: Check if role-specific profile was created
    // ============================================================
    logStep('BEFORE: Verifying role-specific profile', { role })

    let profileTableName: string = ''
    if (role === 'teacher') profileTableName = 'teachers'
    else if (role === 'student') profileTableName = 'students'
    else if (role === 'parent') profileTableName = 'parents'

    let profileVerified = false
    if (profileTableName) {
      const { data: profileData, error: profileError } = await supabase
        .from(profileTableName)
        .select('*')
        .eq('user_id', newUserData.user.id)
        .maybeSingle()

      logStep('Role profile verification', {
        table: profileTableName,
        found: !!profileData,
        error: profileError?.message
      })

      if (!profileData && !profileError) {
        // Profile doesn't exist and no error - create it manually
        logStep(`Manual fallback: Creating ${profileTableName} entry`)
        const insertData: Record<string, unknown> = {
          user_id: newUserData.user.id,
          name: fullName
        }

        if (role === 'teacher') {
          insertData.subject = 'Not assigned'
          insertData.department = 'Unassigned'
        } else if (role === 'student') {
          insertData.class = 'Unassigned'
        }

        const { error: profileInsertError } = await supabase
          .from(profileTableName)
          .insert(insertData)

        if (profileInsertError) {
          logError(`Manual ${profileTableName} insert failed`, profileInsertError)
        } else {
          logStep(`Manual ${profileTableName} entry created`)
          profileVerified = true
        }
      } else if (profileData) {
        profileVerified = true
        logStep(`Profile found in ${profileTableName}`)
      }
    }

    // ============================================================
    // FINAL SUCCESS RESPONSE
    // ============================================================
    logStep('User creation completed successfully', {
      userId: newUserData.user.id,
      email: newUserData.user.email,
      fullName,
      role,
      profileVerified
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: 'User created successfully',
        user: {
          id: newUserData.user.id,
          email: newUserData.user.email,
          full_name: fullName,
          role: role
        },
        debug: {
          triggerWorked: !!verifiedUser,
          profileCreated: profileVerified,
          profileTable: profileTableName
        }
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    logError('Unexpected error in catch block', err)

    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
    const errorStack = err instanceof Error ? err.stack : undefined

    return new Response(
      JSON.stringify({
        success: false,
        error: 'An unexpected error occurred: ' + errorMessage,
        details: {
          message: errorMessage,
          stack: errorStack,
          type: err?.constructor?.name
        }
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
