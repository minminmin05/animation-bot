import { createClient } from '@supabase/supabase-js'

let supabaseClient: ReturnType<typeof createClient> | null = null

function getSupabase() {
  if (!supabaseClient) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set')
    }
    supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    )
  }
  return supabaseClient
}

/**
 * Access scope types
 */
export enum AccessScope {
  SELF = 'SELF',       // Only own data
  CHILDREN = 'CHILDREN', // Children's data (for parents)
  CLASS = 'CLASS',     // Students in teacher's classes
  ALL = 'ALL',         // All data (admin only)
  NONE = 'NONE'        // No access
}

/**
 * Access policy definition from database
 */
interface AccessPolicy {
  id: string
  name: string
  role: string
  resource: string
  action: string
  scope: string
  priority: number
  enabled: boolean
}

/**
 * Access check result
 */
export interface AccessCheck {
  allowed: boolean
  scope: AccessScope
  policy?: string
  reason?: string
}

/**
 * User context for access checks
 */
export interface UserContext {
  userId?: string
  userRole?: string
  studentId?: string  // Set if user is a student
  teacherId?: string // Set if user is a teacher
  parentIds?: string[] // Set if user is a parent
  isAdmin?: boolean
}

/**
 * Get access scope for a user based on policies
 *
 * @param userRole - The user's role (student, teacher, parent, admin)
 * @param resource - The resource being accessed (grades, attendance, schedule, etc.)
 * @param action - The action being performed (read, write, query, etc.)
 * @returns The access scope that should be applied
 */
export async function getAccessScope(
  userRole: string,
  resource: string,
  action: string = 'read'
): Promise<AccessScope> {
  const supabase = getSupabase()

  console.log(`[AccessService] Checking access: role=${userRole}, resource=${resource}, action=${action}`)

  // Admin override - admins get ALL scope but with logging
  if (userRole === 'admin') {
    console.log('[AccessService] Admin access granted - scope=ALL (will be logged)')
    return AccessScope.ALL
  }

  // Query policies from database
  const { data: policies, error } = await supabase
    .from('access_policies')
    .select('*')
    .eq('role', userRole)
    .eq('resource', resource)
    .eq('action', action)
    .eq('enabled', true)
    .order('priority', { ascending: false })
    .limit(1)

  if (error) {
    console.error('[AccessService] Error fetching policies:', error)
    // Fail securely - default to no access
    return AccessScope.NONE
  }

  if (!policies || policies.length === 0) {
    console.log('[AccessService] No policy found - scope=NONE')
    return AccessScope.NONE
  }

  const policy = policies[0] as AccessPolicy
  const scope = policy.scope as AccessScope

  console.log(`[AccessService] Policy found: ${policy.name}, scope=${scope}`)

  return scope
}

/**
 * Check if user has access to a resource
 *
 * @param userContext - The user's context
 * @param resource - The resource being accessed
 * @param action - The action being performed
 * @param targetUserId - Optional: The target user ID (for checking if accessing own data)
 * @returns Access check result
 */
export async function checkAccess(
  userContext: UserContext,
  resource: string,
  action: string = 'read',
  targetUserId?: string
): Promise<AccessCheck> {
  const { userId, userRole, isAdmin } = userContext

  // No user context - check public policies
  if (!userId || !userRole) {
    const scope = await getAccessScope('public', resource, action)
    return {
      allowed: scope !== AccessScope.NONE,
      scope: scope === AccessScope.NONE ? AccessScope.NONE : AccessScope.ALL,
      reason: scope === AccessScope.NONE ? 'Authentication required' : undefined
    }
  }

  // Admin always allowed (with logging)
  if (isAdmin || userRole === 'admin') {
    // Log admin access for audit
    console.log({
      admin_access: true,
      admin_id: userId,
      resource,
      action,
      target_user_id: targetUserId,
      timestamp: new Date().toISOString()
    })

    return {
      allowed: true,
      scope: AccessScope.ALL,
      policy: 'admin_override'
    }
  }

  // Get scope from policies
  const scope = await getAccessScope(userRole, resource, action)

  // Check if scope allows access
  if (scope === AccessScope.NONE) {
    return {
      allowed: false,
      scope: AccessScope.NONE,
      reason: `User role '${userRole}' does not have permission to ${action} ${resource}`
    }
  }

  // For SELF scope, verify user is accessing their own data
  if (scope === AccessScope.SELF && targetUserId && targetUserId !== userId) {
    return {
      allowed: false,
      scope: AccessScope.SELF,
      reason: 'You can only access your own data'
    }
  }

  return {
    allowed: true,
    scope: scope,
    reason: undefined
  }
}

/**
 * Build database query filter based on access scope
 *
 * This is used to enforce access control at the database level
 *
 * @param scope - The access scope
 * @param userContext - The user's context
 * @returns A filter object for Supabase queries
 */
export async function buildScopeFilter(
  scope: AccessScope,
  userContext: UserContext
): Promise<any> {
  const { userId, studentId, teacherId, parentIds } = userContext

  switch (scope) {
    case AccessScope.SELF:
      // Filter to own data only
      if (!userId) {
        throw new Error('Authentication required for SELF scope')
      }

      // For students, filter by their own student_id
      if (userContext.userRole === 'student') {
        // First get the student's internal ID
        const supabase = getSupabase()
        const { data: student } = await supabase
          .from('students')
          .select('id')
          .eq('user_id', userId)
          .single()

        if (student) {
          return { student_id: student.id }
        }
      }

      // For teachers, filter by their own teacher_id
      if (userContext.userRole === 'teacher') {
        if (teacherId) {
          return { teacher_id: teacherId }
        }
      }

      return {}

    case AccessScope.CHILDREN:
      // Filter to children's data only (for parents)
      if (parentIds && parentIds.length > 0) {
        // In a real query, this would be: .in('student_id', parentIds)
        return { student_id: `in(${parentIds.join(',')})` }
      }
      return {}

    case AccessScope.CLASS:
      // Filter to students in teacher's classes
      if (teacherId) {
        // Get all student IDs in teacher's classes
        const supabase = getSupabase()
        const { data: enrollments } = await supabase
          .from('student_class_enrollments')
          .select('student_id')
          .eq('status', 'active')

        // Join with teacher_class_assignments to filter by teacher
        const { data: teacherAssignments } = await supabase
          .from('teacher_class_assignments')
          .select('class_section_id')
          .eq('teacher_id', teacherId)
          .eq('status', 'active')

        const classSectionIds = teacherAssignments?.map(t => t.class_section_id) || []

        if (classSectionIds.length > 0) {
          return {
            student_id: `in (SELECT student_id FROM student_class_enrollments WHERE class_section_id IN (${classSectionIds.map(id => `'${id}'`).join(',')}))`
          }
        }
      }
      return {}

    case AccessScope.ALL:
      // No filtering needed - but should be logged
      if (userContext.userRole === 'admin') {
        console.log(`[AccessService] Admin accessing ALL data in ${userContext.resource || 'resource'}`)
      }
      return {}

    case AccessScope.NONE:
    default:
      throw new Error('Access denied: No valid scope for this request')
  }
}

/**
 * Get all policies for a user role (for debugging/admin)
 */
export async function getPoliciesForRole(role: string): Promise<AccessPolicy[]> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('access_policies')
    .select('*')
    .eq('role', role)
    .eq('enabled', true)
    .order('priority', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch policies: ${error.message}`)
  }

  return (data as AccessPolicy[]) || []
}

/**
 * Check if a specific action is allowed for a role
 */
export async function isActionAllowed(
  role: string,
  resource: string,
  action: string
): Promise<boolean> {
  const scope = await getAccessScope(role, resource, action)
  return scope !== AccessScope.NONE
}
