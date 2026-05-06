import { Request, Response } from 'express'
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
 * Get user role from authorization header
 * This extracts the user role from the auth token
 */
async function getUserRoleFromRequest(req: Request): Promise<{ userId?: string; userRole?: string } | null> {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)

  try {
    // Verify the token with Supabase
    const { data, error } = await getSupabase().auth.getUser(token)

    if (error || !data.user) {
      return null
    }

    // Get user's role from users table
    const { data: userData, error: userError } = await getSupabase()
      .from('users')
      .select('role')
      .eq('id', data.user.id)
      .single()

    if (userError || !userData) {
      return null
    }

    return {
      userId: data.user.id,
      userRole: userData.role
    }
  } catch (error) {
    console.error('[Access Policies API] Error verifying token:', error)
    return null
  }
}

/**
 * GET /api/access-policies
 * Get all access policies
 */
export async function getAccessPolicies(req: Request, res: Response) {
  try {
    console.log('[Access Policies API] GET /api/access-policies')

    // Verify user is authenticated and is admin
    const userContext = await getUserRoleFromRequest(req)

    if (!userContext) {
      console.log('[Access Policies API] Unauthenticated request')
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authentication required'
      })
    }

    if (userContext.userRole !== 'admin') {
      console.log('[Access Policies API] Non-admin access attempt:', userContext.userRole)
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Only admins can view access policies'
      })
    }

    // Fetch all policies
    const { data: policies, error } = await getSupabase()
      .from('access_policies')
      .select('*')
      .order('priority', { ascending: false })
      .order('role', { ascending: true })
      .order('resource', { ascending: true })

    if (error) {
      console.error('[Access Policies API] Error fetching policies:', error)
      throw error
    }

    console.log('[Access Policies API] Returning', policies?.length || 0, 'policies')

    res.json({
      policies: policies?.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        role: p.role,
        resource: p.resource,
        action: p.action,
        scope: p.scope,
        enabled: p.enabled,
        priority: p.priority,
        created_at: p.created_at,
        updated_at: p.updated_at
      })) || []
    })
  } catch (error: any) {
    console.error('[Access Policies API] Error:', error)
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error.message || 'Failed to fetch access policies'
    })
  }
}

/**
 * PUT /api/access-policies/:id
 * Update a single access policy
 */
export async function updateAccessPolicy(req: Request, res: Response) {
  try {
    const { id } = req.params
    const { scope, enabled } = req.body

    console.log('[Access Policies API] PUT /api/access-policies/:id', { id, scope, enabled })

    // Validate inputs
    if (!id) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'Policy ID is required'
      })
    }

    // Validate scope if provided
    const validScopes = ['SELF', 'CHILDREN', 'CLASS', 'ALL', 'NONE']
    if (scope !== undefined && !validScopes.includes(scope)) {
      return res.status(400).json({
        error: 'INVALID_SCOPE',
        message: `Scope must be one of: ${validScopes.join(', ')}`
      })
    }

    // Verify user is authenticated and is admin
    const userContext = await getUserRoleFromRequest(req)

    if (!userContext) {
      console.log('[Access Policies API] Unauthenticated update attempt')
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authentication required'
      })
    }

    if (userContext.userRole !== 'admin') {
      console.log('[Access Policies API] Non-admin update attempt:', userContext.userRole)
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Only admins can update access policies'
      })
    }

    // Prepare update object
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (scope !== undefined) {
      updateData.scope = scope
    }

    if (enabled !== undefined) {
      updateData.enabled = enabled
    }

    // Update the policy
    const { data: policy, error } = await getSupabase()
      .from('access_policies')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[Access Policies API] Error updating policy:', error)
      throw error
    }

    if (!policy) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Access policy not found'
      })
    }

    console.log('[Access Policies API] Policy updated:', policy.name)

    // Log the change for audit
    console.log({
      admin_id: userContext.userId,
      action: 'update_access_policy',
      policy_id: id,
      policy_name: policy.name,
      changes: updateData,
      timestamp: new Date().toISOString()
    })

    res.json({
      success: true,
      message: 'Access policy updated successfully',
      policy: {
        id: policy.id,
        name: policy.name,
        role: policy.role,
        resource: policy.resource,
        action: policy.action,
        scope: policy.scope,
        enabled: policy.enabled
      }
    })
  } catch (error: any) {
    console.error('[Access Policies API] Error:', error)
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error.message || 'Failed to update access policy'
    })
  }
}

/**
 * POST /api/access-policies
 * Create a new access policy (admin only)
 */
export async function createAccessPolicy(req: Request, res: Response) {
  try {
    const { name, description, role, resource, action, scope, enabled = true, priority = 100 } = req.body

    console.log('[Access Policies API] POST /api/access-policies', { name, role, resource, action, scope })

    // Validate required fields
    if (!name || !role || !resource || !action || !scope) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'Missing required fields: name, role, resource, action, scope'
      })
    }

    // Validate enum values
    const validRoles = ['student', 'teacher', 'parent', 'admin', 'public']
    const validActions = ['read', 'write', 'delete', 'manage', 'query']
    const validScopes = ['SELF', 'CHILDREN', 'CLASS', 'ALL', 'NONE']

    if (!validRoles.includes(role)) {
      return res.status(400).json({
        error: 'INVALID_ROLE',
        message: `Role must be one of: ${validRoles.join(', ')}`
      })
    }

    if (!validActions.includes(action)) {
      return res.status(400).json({
        error: 'INVALID_ACTION',
        message: `Action must be one of: ${validActions.join(', ')}`
      })
    }

    if (!validScopes.includes(scope)) {
      return res.status(400).json({
        error: 'INVALID_SCOPE',
        message: `Scope must be one of: ${validScopes.join(', ')}`
      })
    }

    // Verify user is authenticated and is admin
    const userContext = await getUserRoleFromRequest(req)

    if (!userContext || userContext.userRole !== 'admin') {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Only admins can create access policies'
      })
    }

    // Create the policy
    const { data: policy, error } = await getSupabase()
      .from('access_policies')
      .insert({
        name,
        description,
        role,
        resource,
        action,
        scope,
        enabled,
        priority
      })
      .select()
      .single()

    if (error) {
      console.error('[Access Policies API] Error creating policy:', error)
      throw error
    }

    console.log('[Access Policies API] Policy created:', policy.name)

    res.json({
      success: true,
      message: 'Access policy created successfully',
      policy: {
        id: policy.id,
        name: policy.name,
        role: policy.role,
        resource: policy.resource,
        action: policy.action,
        scope: policy.scope,
        enabled: policy.enabled,
        priority: policy.priority
      }
    })
  } catch (error: any) {
    console.error('[Access Policies API] Error:', error)
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error.message || 'Failed to create access policy'
    })
  }
}

/**
 * DELETE /api/access-policies/:id
 * Delete an access policy (admin only)
 */
export async function deleteAccessPolicy(req: Request, res: Response) {
  try {
    const { id } = req.params

    console.log('[Access Policies API] DELETE /api/access-policies/:id', { id })

    // Verify user is authenticated and is admin
    const userContext = await getUserRoleFromRequest(req)

    if (!userContext || userContext.userRole !== 'admin') {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Only admins can delete access policies'
      })
    }

    // Get policy details before deletion for audit
    const { data: existingPolicy } = await getSupabase()
      .from('access_policies')
      .select('name')
      .eq('id', id)
      .single()

    // Delete the policy
    const { error } = await getSupabase()
      .from('access_policies')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[Access Policies API] Error deleting policy:', error)
      throw error
    }

    console.log('[Access Policies API] Policy deleted:', existingPolicy?.name || id)

    // Log the deletion for audit
    console.log({
      admin_id: userContext.userId,
      action: 'delete_access_policy',
      policy_id: id,
      policy_name: existingPolicy?.name,
      timestamp: new Date().toISOString()
    })

    res.json({
      success: true,
      message: 'Access policy deleted successfully'
    })
  } catch (error: any) {
    console.error('[Access Policies API] Error:', error)
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error.message || 'Failed to delete access policy'
    })
  }
}

/**
 * POST /api/access-policies/reset
 * Reset all policies to default
 */
export async function resetAccessPolicies(req: Request, res: Response) {
  try {
    console.log('[Access Policies API] POST /api/access-policies/reset')

    // Verify user is authenticated and is admin
    const userContext = await getUserRoleFromRequest(req)

    if (!userContext || userContext.userRole !== 'admin') {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Only admins can reset access policies'
      })
    }

    const supabase = getSupabase()

    // Delete all existing policies
    await supabase.from('access_policies').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // Insert default policies
    const defaultPolicies = [
      // Student policies
      { name: 'student_read_own_grades', description: 'Students can read their own grades', role: 'student', resource: 'grades', action: 'read', scope: 'SELF', priority: 100 },
      { name: 'student_read_own_attendance', description: 'Students can read their own attendance', role: 'student', resource: 'attendance', action: 'read', scope: 'SELF', priority: 100 },
      { name: 'student_read_own_schedule', description: 'Students can read their own schedule', role: 'student', resource: 'schedule', action: 'read', scope: 'SELF', priority: 100 },
      { name: 'student_query_knowledge_base', description: 'Students can query the knowledge base', role: 'student', resource: 'knowledge_base', action: 'query', scope: 'ALL', priority: 50 },

      // Teacher policies
      { name: 'teacher_read_class_grades', description: 'Teachers can read grades for their classes', role: 'teacher', resource: 'grades', action: 'read', scope: 'CLASS', priority: 100 },
      { name: 'teacher_read_class_attendance', description: 'Teachers can read attendance for their classes', role: 'teacher', resource: 'attendance', action: 'read', scope: 'CLASS', priority: 100 },
      { name: 'teacher_write_grades', description: 'Teachers can write grades for their classes', role: 'teacher', resource: 'grades', action: 'write', scope: 'CLASS', priority: 100 },
      { name: 'teacher_manage_classes', description: 'Teachers can manage their own classes', role: 'teacher', resource: 'classes', action: 'manage', scope: 'CLASS', priority: 100 },
      { name: 'teacher_query_knowledge_base', description: 'Teachers can query the knowledge base', role: 'teacher', resource: 'knowledge_base', action: 'query', scope: 'ALL', priority: 50 },

      // Parent policies
      { name: 'parent_read_child_grades', description: 'Parents can read their children grades', role: 'parent', resource: 'grades', action: 'read', scope: 'CHILDREN', priority: 100 },
      { name: 'parent_read_child_attendance', description: 'Parents can read their children attendance', role: 'parent', resource: 'attendance', action: 'read', scope: 'CHILDREN', priority: 100 },
      { name: 'parent_read_child_schedule', description: 'Parents can read their children schedule', role: 'parent', resource: 'schedule', action: 'read', scope: 'CHILDREN', priority: 100 },
      { name: 'parent_query_knowledge_base', description: 'Parents can query the knowledge base', role: 'parent', resource: 'knowledge_base', action: 'query', scope: 'ALL', priority: 50 },

      // Admin policies
      { name: 'admin_manage_all', description: 'Admins can manage everything', role: 'admin', resource: 'all', action: 'manage', scope: 'ALL', priority: 1000 },
      { name: 'admin_query_knowledge_base', description: 'Admins can query the knowledge base', role: 'admin', resource: 'knowledge_base', action: 'query', scope: 'ALL', priority: 50 },

      // Public policies
      { name: 'public_query_knowledge_base', description: 'Public can query the knowledge base', role: 'public', resource: 'knowledge_base', action: 'query', scope: 'ALL', priority: 10 }
    ]

    const { data: policies, error } = await supabase
      .from('access_policies')
      .insert(defaultPolicies)
      .select()

    if (error) {
      console.error('[Access Policies API] Error resetting policies:', error)
      throw error
    }

    console.log('[Access Policies API] Policies reset to default:', policies?.length || 0, 'policies created')

    // Log the reset for audit
    console.log({
      admin_id: userContext.userId,
      action: 'reset_access_policies',
      timestamp: new Date().toISOString()
    })

    res.json({
      success: true,
      message: `Reset to default policies. ${policies?.length || 0} policies created.`,
      count: policies?.length || 0
    })
  } catch (error: any) {
    console.error('[Access Policies API] Error:', error)
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error.message || 'Failed to reset access policies'
    })
  }
}

/**
 * GET /api/access-policies/summary
 * Get a summary of current access policies grouped by role
 */
export async function getAccessPoliciesSummary(req: Request, res: Response) {
  try {
    console.log('[Access Policies API] GET /api/access-policies/summary')

    // Verify user is authenticated
    const userContext = await getUserRoleFromRequest(req)

    if (!userContext) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authentication required'
      })
    }

    if (userContext.userRole !== 'admin') {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Only admins can view access policy summaries'
      })
    }

    // Fetch all policies
    const { data: policies, error } = await getSupabase()
      .from('access_policies')
      .select('*')
      .eq('enabled', true)
      .order('priority', { ascending: false })

    if (error) {
      throw error
    }

    // Group by role
    const summary = {
      student: policies?.filter(p => p.role === 'student').length || 0,
      teacher: policies?.filter(p => p.role === 'teacher').length || 0,
      parent: policies?.filter(p => p.role === 'parent').length || 0,
      admin: policies?.filter(p => p.role === 'admin').length || 0,
      public: policies?.filter(p => p.role === 'public').length || 0,
      total: policies?.length || 0
    }

    // Group by resource
    const byResource = policies?.reduce((acc, p) => {
      acc[p.resource] = (acc[p.resource] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    res.json({
      summary,
      byResource,
      policies: policies?.map(p => ({
        id: p.id,
        name: p.name,
        role: p.role,
        resource: p.resource,
        action: p.action,
        scope: p.scope
      })) || []
    })
  } catch (error: any) {
    console.error('[Access Policies API] Error:', error)
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error.message || 'Failed to fetch access policy summary'
    })
  }
}
