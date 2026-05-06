import { createClient } from '@supabase/supabase-js'
import {
  getAccessScope,
  buildScopeFilter,
  AccessScope,
  UserContext
} from './access.service'

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

export interface GradeInfo {
  subject: string
  score: number
  grade: string
  class_name?: string
  assignment_title?: string
}

export interface AttendanceInfo {
  date: string
  status: string
  class_name?: string
}

export interface ScheduleInfo {
  subject: string
  class_name: string
  room_number?: string
  teacher_name?: string
  schedule?: string
}

/**
 * Build user context from user ID and role
 */
async function buildUserContext(userId: string, userRole: string): Promise<UserContext> {
  const context: UserContext = {
    userId,
    userRole,
    isAdmin: userRole === 'admin'
  }

  // Get role-specific IDs
  switch (userRole) {
    case 'student': {
      const { data: student } = await getSupabase()
        .from('students')
        .select('id')
        .eq('user_id', userId)
        .single()
      context.studentId = student?.id
      break
    }
    case 'teacher': {
      const { data: teacher } = await getSupabase()
        .from('teachers')
        .select('id')
        .eq('user_id', userId)
        .single()
      context.teacherId = teacher?.id
      break
    }
    case 'parent': {
      const { data: parent } = await getSupabase()
        .from('parents')
        .select('id')
        .eq('user_id', userId)
        .single()
      if (parent?.id) {
        // Get all children IDs for this parent
        const { data: relations } = await getSupabase()
          .from('student_parent_relations')
          .select('student_id')
          .eq('parent_id', parent.id)
        context.parentIds = relations?.map(r => r.student_id) || []
      }
      break
    }
  }

  return context
}

/**
 * Get student's internal ID from user_id
 */
async function getStudentIdFromUserId(userId: string): Promise<string | null> {
  const { data: student } = await getSupabase()
    .from('students')
    .select('id')
    .eq('user_id', userId)
    .single()
  return student?.id || null
}

/**
 * Get teacher's internal ID from user_id
 */
async function getTeacherIdFromUserId(userId: string): Promise<string | null> {
  const { data: teacher } = await getSupabase()
    .from('teachers')
    .select('id')
    .eq('user_id', userId)
    .single()
  return teacher?.id || null
}

/**
 * Get student IDs based on access scope
 */
async function getStudentIdsByScope(
  scope: AccessScope,
  userContext: UserContext
): Promise<string[]> {
  const supabase = getSupabase()

  switch (scope) {
    case AccessScope.SELF:
      // Only own data
      if (userContext.userRole === 'student' && userContext.studentId) {
        return [userContext.studentId]
      }
      return []

    case AccessScope.CHILDREN:
      // Parent's children
      return userContext.parentIds || []

    case AccessScope.CLASS:
      // Students in teacher's classes
      if (userContext.teacherId) {
        const { data: enrollments } = await supabase
          .from('student_class_enrollments')
          .select('student_id')
          .eq('status', 'active')

        // Filter by teacher's classes
        const { data: teacherAssignments } = await supabase
          .from('teacher_class_assignments')
          .select('class_section_id')
          .eq('teacher_id', userContext.teacherId)
          .eq('status', 'active')

        const classSectionIds = teacherAssignments?.map(t => t.class_section_id) || []

        if (classSectionIds.length > 0 && enrollments) {
          return enrollments
            .filter(e => classSectionIds.includes(e.class_section_id))
            .map(e => e.student_id)
        }
      }
      return []

    case AccessScope.ALL:
      // Admin access - no filter needed but log it
      console.log(`[GradeService] Admin accessing ALL data`, {
        admin_id: userContext.userId,
        timestamp: new Date().toISOString()
      })
      return [] // Empty means no filter

    case AccessScope.NONE:
    default:
      throw new Error('ACCESS_DENIED: No access scope for this request')
  }
}

/**
 * Get student grades with dynamic access control
 */
export async function getStudentGrades(
  userId: string,
  userRole: string
): Promise<GradeInfo[]> {
  console.log('[GradeService] Fetching grades for user:', { userId, userRole })

  // Check access scope from policies
  const scope = await getAccessScope(userRole, 'grades', 'read')
  console.log('[GradeService] Access scope:', scope)

  if (scope === AccessScope.NONE) {
    console.log('[GradeService] Access denied: NONE scope')
    return []
  }

  // Build user context
  const userContext = await buildUserContext(userId, userRole)

  // Admin logging
  if (scope === AccessScope.ALL) {
    console.log('[GradeService] Admin accessing all grades', {
      admin_id: userId,
      timestamp: new Date().toISOString()
    })
  }

  // Get student IDs based on scope
  const studentIds = await getStudentIdsByScope(scope, userContext)

  // Build query
  let query = getSupabase()
    .from('student_grades')
    .select(`
      percentage,
      letter_grade,
      student_id,
      assignments (
        title,
        max_points,
        class_sections (
          name,
          subject
        )
      )
    `)
    .not('percentage', 'is', null)
    .order('submitted_at', { ascending: false })
    .limit(50)

  // Apply filter based on scope
  if (studentIds.length > 0) {
    query = query.in('student_id', studentIds)
  }

  const { data: grades, error } = await query

  if (error) {
    console.error('[GradeService] Error fetching grades:', error)
    return []
  }

  console.log('[GradeService] Found', grades?.length || 0, 'grade records')

  return grades?.map(g => ({
    subject: g.assignments?.class_sections?.subject || 'Unknown',
    score: Math.round(g.percentage || 0),
    grade: g.letter_grade || 'N/A',
    class_name: g.assignments?.class_sections?.name,
    assignment_title: g.assignments?.title
  })) || []
}

/**
 * Get student attendance with dynamic access control
 */
export async function getStudentAttendance(
  userId: string,
  userRole: string
): Promise<AttendanceInfo[]> {
  console.log('[GradeService] Fetching attendance for user:', { userId, userRole })

  // Check access scope from policies
  const scope = await getAccessScope(userRole, 'attendance', 'read')
  console.log('[GradeService] Access scope:', scope)

  if (scope === AccessScope.NONE) {
    console.log('[GradeService] Access denied: NONE scope')
    return []
  }

  // Build user context
  const userContext = await buildUserContext(userId, userRole)

  // Admin logging
  if (scope === AccessScope.ALL) {
    console.log('[GradeService] Admin accessing all attendance', {
      admin_id: userId,
      timestamp: new Date().toISOString()
    })
  }

  // Get student IDs based on scope
  const studentIds = await getStudentIdsByScope(scope, userContext)

  // Build query
  let query = getSupabase()
    .from('attendance')
    .select(`
      date,
      status,
      student_id,
      classes (
        name,
        subject
      )
    `)
    .order('date', { ascending: false })
    .limit(50)

  // Apply filter based on scope
  if (studentIds.length > 0) {
    query = query.in('student_id', studentIds)
  }

  const { data: attendance, error } = await query

  if (error) {
    console.error('[GradeService] Error fetching attendance:', error)
    return []
  }

  console.log('[GradeService] Found', attendance?.length || 0, 'attendance records')

  return attendance?.map(a => ({
    date: a.date,
    status: a.status,
    class_name: a.classes?.name
  })) || []
}

/**
 * Get student schedule with dynamic access control
 */
export async function getStudentSchedule(
  userId: string,
  userRole: string
): Promise<ScheduleInfo[]> {
  console.log('[GradeService] Fetching schedule for user:', { userId, userRole })

  // Check access scope from policies
  const scope = await getAccessScope(userRole, 'schedule', 'read')
  console.log('[GradeService] Access scope:', scope)

  if (scope === AccessScope.NONE) {
    console.log('[GradeService] Access denied: NONE scope')
    return []
  }

  // Build user context
  const userContext = await buildUserContext(userId, userRole)

  // Admin logging
  if (scope === AccessScope.ALL) {
    console.log('[GradeService] Admin accessing all schedules', {
      admin_id: userId,
      timestamp: new Date().toISOString()
    })
  }

  // Get student IDs based on scope
  const studentIds = await getStudentIdsByScope(scope, userContext)

  // Build query
  let query = getSupabase()
    .from('student_class_enrollments')
    .select(`
      status,
      student_id,
      class_sections (
        name,
        subject,
        room_number,
        schedule
      ),
      teacher_class_assignments (
        teachers (
          name
        )
      )
    `)
    .eq('status', 'active')
    .limit(50)

  // Apply filter based on scope
  if (studentIds.length > 0) {
    query = query.in('student_id', studentIds)
  }

  const { data: enrollments, error } = await query

  if (error) {
    console.error('[GradeService] Error fetching schedule:', error)
    return []
  }

  console.log('[GradeService] Found', enrollments?.length || 0, 'active enrollments')

  return enrollments?.map(e => ({
    subject: e.class_sections?.subject || 'Unknown',
    class_name: e.class_sections?.name || 'Unknown',
    room_number: e.class_sections?.room_number,
    teacher_name: e.teacher_class_assignments?.[0]?.teachers?.name,
    schedule: e.class_sections?.schedule
  })) || []
}

/**
 * Get personal data based on query type with dynamic access control
 */
export async function getPersonalData(
  userId: string,
  userRole: string,
  dataType: 'grades' | 'attendance' | 'schedule'
): Promise<GradeInfo[] | AttendanceInfo[] | ScheduleInfo[]> {
  console.log('[GradeService] Personal data request:', { userId, userRole, dataType })

  // Verify user has access to this resource type
  const scope = await getAccessScope(userRole, dataType, 'read')

  if (scope === AccessScope.NONE) {
    console.log('[GradeService] Access denied to', dataType)
    throw new Error(`ACCESS_DENIED: You do not have permission to view ${dataType}`)
  }

  switch (dataType) {
    case 'grades':
      return await getStudentGrades(userId, userRole)
    case 'attendance':
      return await getStudentAttendance(userId, userRole)
    case 'schedule':
      return await getStudentSchedule(userId, userRole)
    default:
      return []
  }
}

/**
 * Detect what type of personal data is being requested from the question
 */
export function detectPersonalDataType(question: string): 'grades' | 'attendance' | 'schedule' {
  const q = question.toLowerCase()

  // Check for attendance FIRST (more specific patterns)
  if (/attendance|how many.*miss|absent.*day|present|late|มาเรียน|ขาด|สาย|ลา|มา/.test(q)) {
    return 'attendance'
  }

  // Check for grades (more specific patterns after attendance)
  if (/grade|score|gpa|คะแนน|เกรด|สอบ|ผลการเรียน|academic/.test(q)) {
    return 'grades'
  }

  // Check for schedule (most general)
  if (/schedule|timetable|ตาราง|คลาส|วิชา|เรียน/.test(q)) {
    return 'schedule'
  }

  return 'grades' // Default to grades
}

/**
 * Check if user has permission to access a resource
 * Useful for pre-flight checks in API handlers
 */
export async function checkDataAccess(
  userId: string,
  userRole: string,
  resource: string,
  action: string = 'read'
): Promise<{ allowed: boolean; scope: AccessScope }> {
  const scope = await getAccessScope(userRole, resource, action)

  // Build context for additional checks
  const userContext = await buildUserContext(userId, userRole)

  return {
    allowed: scope !== AccessScope.NONE,
    scope
  }
}

/**
 * Get accessible student IDs for a user
 * Returns a list of student IDs the user can access based on their role and policies
 */
export async function getAccessibleStudentIds(
  userId: string,
  userRole: string,
  resource: string = 'grades'
): Promise<string[]> {
  const scope = await getAccessScope(userRole, resource, 'read')
  const userContext = await buildUserContext(userId, userRole)
  return await getStudentIdsByScope(scope, userContext)
}
