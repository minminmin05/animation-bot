/**
 * Dynamic Access Control System - Examples and Usage
 *
 * This file demonstrates how to use the policy-based access control system
 * to replace hardcoded role checks throughout the application.
 */

import {
  getAccessScope,
  checkAccess,
  AccessScope,
  UserContext
} from './access.service'

// ============================================================================
// EXAMPLE 1: Basic Access Check
// ============================================================================

/**
 * Before (Hardcoded - DON'T DO THIS):
 */
async function oldWay(userId: string, userRole: string) {
  // ❌ Hardcoded role check
  if (userRole !== 'admin' && userRole !== 'teacher') {
    throw new Error('Unauthorized')
  }
  // ... fetch data
}

/**
 * After (Policy-based - DO THIS):
 */
async function newWay(userId: string, userRole: string) {
  // ✅ Dynamic policy check
  const scope = await getAccessScope(userRole, 'grades', 'read')

  if (scope === AccessScope.NONE) {
    throw new Error('ACCESS_DENIED: No permission to view grades')
  }

  // Apply filters based on scope
  if (scope === AccessScope.SELF) {
    // Add filter: student_id = currentStudentId
  } else if (scope === AccessScope.CHILDREN) {
    // Add filter: student_id IN (parent's children IDs)
  } else if (scope === AccessScope.CLASS) {
    // Add filter: student_id IN (teacher's class student IDs)
  }
  // scope === AccessScope.ALL: No filter needed (admin)

  // ... fetch data with applied filter
}

// ============================================================================
// EXAMPLE 2: Grade Service Integration
// ============================================================================

/**
 * Example: Fetch grades with proper access control
 */
async function fetchGradesSecurely(userId: string, userRole: string) {
  // Step 1: Check access scope
  const scope = await getAccessScope(userRole, 'grades', 'read')
  console.log(`[Access] User ${userId} (${userRole}) has scope: ${scope}`)

  // Step 2: Get user context
  const userContext: UserContext = { userId, userRole, isAdmin: userRole === 'admin' }

  // Step 3: Build filter based on scope
  let studentFilter: string[] = []

  switch (scope) {
    case AccessScope.SELF:
      // Get student's own ID
      const studentId = await getStudentIdByUserId(userId)
      studentFilter = [studentId]
      break

    case AccessScope.CHILDREN:
      // Get parent's children IDs
      const childrenIds = await getChildrenIdsByParentUserId(userId)
      studentFilter = childrenIds
      break

    case AccessScope.CLASS:
      // Get teacher's class student IDs
      const classStudentIds = await getStudentIdsByTeacherUserId(userId)
      studentFilter = classStudentIds
      break

    case AccessScope.ALL:
      // Admin: Log access but don't filter
      console.log(`[Audit] Admin ${userId} accessed all grades at ${new Date().toISOString()}`)
      break

    case AccessScope.NONE:
      throw new Error('ACCESS_DENIED: No permission to view grades')
  }

  // Step 4: Execute query with filter
  const query = supabase
    .from('student_grades')
    .select('*')

  if (studentFilter.length > 0) {
    query.in('student_id', studentFilter)
  }

  const { data, error } = await query
  return data
}

// ============================================================================
// EXAMPLE 3: API Endpoint Pattern
// ============================================================================

/**
 * Example API endpoint using the access control system
 */
app.get('/api/grades', async (req, res) => {
  try {
    const { userId, userRole } = req.auth // From auth middleware

    // NEVER trust frontend - always verify on backend
    const scope = await getAccessScope(userRole, 'grades', 'read')

    if (scope === AccessScope.NONE) {
      return res.status(403).json({
        error: 'ACCESS_DENIED',
        message: 'You do not have permission to view grades'
      })
    }

    // Apply scope-based filtering
    const accessibleStudentIds = await getAccessibleStudentIds(userId, userRole)

    // Query with filter
    const grades = await supabase
      .from('student_grades')
      .select('*')
      .in('student_id', accessibleStudentIds.length > 0 ? accessibleStudentIds : [''])

    res.json(grades)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// ============================================================================
// EXAMPLE 4: Write Operations
// ============================================================================

/**
 * Example: Teacher updating grades
 */
async function updateGrade(teacherUserId: string, gradeId: string, newGrade: number) {
  // Check write permission
  const scope = await getAccessScope('teacher', 'grades', 'write')

  if (scope === AccessScope.NONE) {
    throw new Error('ACCESS_DENIED: Teachers cannot write grades')
  }

  if (scope === AccessScope.CLASS) {
    // Verify teacher is assigned to the class
    const teacherId = await getTeacherIdByUserId(teacherUserId)
    const classId = await getClassIdForGrade(gradeId)

    const isAssigned = await verifyTeacherClassAssignment(teacherId, classId)
    if (!isAssigned) {
      throw new Error('ACCESS_DENIED: You can only modify grades for your classes')
    }
  }

  // Proceed with update
  await supabase
    .from('student_grades')
    .update({ percentage: newGrade })
    .eq('id', gradeId)
}

// ============================================================================
// EXAMPLE 5: Parent Accessing Children's Data
// ============================================================================

/**
 * Example: Parent viewing children's attendance
 */
async function fetchChildrenAttendance(parentUserId: string) {
  const scope = await getAccessScope('parent', 'attendance', 'read')

  if (scope !== AccessScope.CHILDREN) {
    throw new Error('ACCESS_DENIED: Invalid scope for parent')
  }

  // Get parent's internal ID
  const parentId = await getParentIdByUserId(parentUserId)

  // Get children's student IDs
  const { data: relations } = await supabase
    .from('student_parent_relations')
    .select('student_id')
    .eq('parent_id', parentId)

  const childrenIds = relations.map(r => r.student_id)

  // Query attendance for children only
  const { data: attendance } = await supabase
    .from('attendance')
    .select('*')
    .in('student_id', childrenIds)

  return attendance
}

// ============================================================================
// EXAMPLE 6: Admin Override with Logging
// ============================================================================

/**
 * Example: Admin accessing all data with audit trail
 */
async function adminViewAllData(adminUserId: string) {
  const scope = await getAccessScope('admin', 'grades', 'read')

  if (scope !== AccessScope.ALL) {
    throw new Error('ACCESS_DENIED: Admin should have ALL scope')
  }

  // Log admin access for audit
  await logAdminAccess({
    admin_id: adminUserId,
    resource: 'grades',
    action: 'read',
    timestamp: new Date().toISOString(),
    ip_address: getClientIp()
  })

  // No filtering - admin can see everything
  const { data: allGrades } = await supabase
    .from('student_grades')
    .select('*')

  return allGrades
}

// ============================================================================
// POLICY CONFIGURATION EXAMPLES
// ============================================================================

/**
 * These policies are stored in the access_policies table.
 * You can modify access control by updating the database without code changes!
 */

/*
-- Example: Allow students to read their own grades
INSERT INTO access_policies (name, role, resource, action, scope, priority)
VALUES ('student_read_own_grades', 'student', 'grades', 'read', 'SELF', 100);

-- Example: Allow teachers to read grades for their classes
INSERT INTO access_policies (name, role, resource, action, scope, priority)
VALUES ('teacher_read_class_grades', 'teacher', 'grades', 'read', 'CLASS', 100);

-- Example: Allow teachers to write grades for their classes
INSERT INTO access_policies (name, role, resource, action, scope, priority)
VALUES ('teacher_write_grades', 'teacher', 'grades', 'write', 'CLASS', 100);

-- Example: Allow parents to read their children's data
INSERT INTO access_policies (name, role, resource, action, scope, priority)
VALUES ('parent_read_child_grades', 'parent', 'grades', 'read', 'CHILDREN', 100);

-- Example: Admin can do everything
INSERT INTO access_policies (name, role, resource, action, scope, priority)
VALUES ('admin_all_access', 'admin', 'all', 'manage', 'ALL', 1000);
*/

// ============================================================================
// SECURITY CHECKLIST
// ============================================================================

/**
 * ✅ SECURITY CHECKLIST:
 *
 * 1. NEVER trust frontend data - always verify user role on backend
 * 2. ALWAYS use getAccessScope() before fetching data
 * 3. ALWAYS apply filters based on returned scope
 * 4. LOG admin access for audit trails
 * 5. FAIL securely - default to NONE scope on errors
 * 6. Use prepared statements - never interpolate user input
 * 7. Validate action type (read, write, delete, manage)
 * 8. Check both role AND resource AND action
 *
 * ❌ COMMON MISTAKES TO AVOID:
 *
 * 1. Checking only role without resource: if (userRole === 'admin')
 * 2. Skipping scope filtering after access check
 * 3. Returning ALL data when scope is SELF
 * 4. Trusting frontend to filter data
 * 5. Not logging admin actions
 * 6. Hardcoding role checks in business logic
 */

// ============================================================================
// HELPER FUNCTIONS (implementation depends on your schema)
// ============================================================================

async function getStudentIdByUserId(userId: string): Promise<string> {
  const { data } = await supabase
    .from('students')
    .select('id')
    .eq('user_id', userId)
    .single()
  return data?.id
}

async function getChildrenIdsByParentUserId(userId: string): Promise<string[]> {
  const { data: parent } = await supabase
    .from('parents')
    .select('id')
    .eq('user_id', userId)
    .single()

  const { data: relations } = await supabase
    .from('student_parent_relations')
    .select('student_id')
    .eq('parent_id', parent.id)

  return relations?.map(r => r.student_id) || []
}

async function getStudentIdsByTeacherUserId(userId: string): Promise<string[]> {
  const { data: teacher } = await supabase
    .from('teachers')
    .select('id')
    .eq('user_id', userId)
    .single()

  const { data: assignments } = await supabase
    .from('teacher_class_assignments')
    .select('class_section_id')
    .eq('teacher_id', teacher.id)
    .eq('status', 'active')

  const classIds = assignments?.map(a => a.class_section_id) || []

  const { data: enrollments } = await supabase
    .from('student_class_enrollments')
    .select('student_id')
    .in('class_section_id', classIds)
    .eq('status', 'active')

  return [...new Set(enrollments?.map(e => e.student_id) || [])]
}

async function getTeacherIdByUserId(userId: string): Promise<string> {
  const { data } = await supabase
    .from('teachers')
    .select('id')
    .eq('user_id', userId)
    .single()
  return data?.id
}

async function getParentIdByUserId(userId: string): Promise<string> {
  const { data } = await supabase
    .from('parents')
    .select('id')
    .eq('user_id', userId)
    .single()
  return data?.id
}

async function getClassIdForGrade(gradeId: string): Promise<string> {
  const { data } = await supabase
    .from('student_grades')
    .select('class_section_id')
    .eq('id', gradeId)
    .single()
  return data?.class_section_id
}

async function verifyTeacherClassAssignment(
  teacherId: string,
  classId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('teacher_class_assignments')
    .select('id')
    .eq('teacher_id', teacherId)
    .eq('class_section_id', classId)
    .eq('status', 'active')
    .single()
  return !!data
}

async function logAdminAccess(logEntry: any): Promise<void> {
  await supabase.from('admin_access_logs').insert(logEntry)
}

function getClientIp(): string {
  // Implementation depends on your server setup
  return 'unknown'
}

export {
  // Example functions
  newWay,
  fetchGradesSecurely,
  updateGrade,
  fetchChildrenAttendance,
  adminViewAllData
}
