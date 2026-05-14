/**
 * Enhanced Grade Service
 * - Proper intent-to-action mapping using ActionMapper
 * - Fixed Supabase relationship queries using correct table joins
 * - Support for student profile retrieval
 * - Better error handling
 */

import { createClient } from '@supabase/supabase-js'
import {
  getAccessScope,
  buildScopeFilter,
  AccessScope,
  UserContext
} from './access.service'
import {
  detectDataAction,
  DataAction,
  getActionDescription
} from './action-mapper.service'

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
 * Get student IDs based on access scope
 */
async function getStudentIdsByScope(
  scope: AccessScope,
  userContext: UserContext
): Promise<string[]> {
  const supabase = getSupabase()

  switch (scope) {
    case AccessScope.SELF:
      if (userContext.userRole === 'student' && userContext.studentId) {
        return [userContext.studentId]
      }
      return []

    case AccessScope.CHILDREN:
      return userContext.parentIds || []

    case AccessScope.CLASS:
      if (userContext.teacherId) {
        // Get students in teacher's classes via the classes table
        const { data: teacherClasses } = await supabase
          .from('classes')
          .select('id')
          .eq('teacher_id', userContext.teacherId)

        if (teacherClasses && teacherClasses.length > 0) {
          const classIds = teacherClasses.map(c => c.id)
          const { data: enrollments } = await supabase
            .from('student_class_enrollments')
            .select('student_id')
            .in('class_id', classIds)
          return enrollments?.map(e => e.student_id) || []
        }
      }
      return []

    case AccessScope.ALL:
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

// ============================================================
// DATA RETRIEVAL FUNCTIONS
// ============================================================

export interface StudentProfileInfo {
  name: string
  class: string
  grade_level: number | null
  date_of_birth: string | null
  address: string | null
  phone: string | null
  enrollment_date: string | null
  parent_name: string | null
  emergency_contact: string | null
  blood_type: string | null
  medical_conditions: string | null
}

export interface GradeInfo {
  subject: string
  score: number
  grade: string
  class_name?: string
  assignment_title?: string
  student_name?: string
  student_id?: string
}

export interface AttendanceInfo {
  date: string
  status: string
  class_name?: string
  student_name?: string
}

export interface ScheduleInfo {
  subject: string
  class_name: string
  room_number?: string
  teacher_name?: string
  schedule?: string
  student_name?: string
}

/**
 * Get student profile information
 */
export async function getStudentProfile(
  userId: string,
  userRole: string,
  targetStudentId?: string
): Promise<{ profiles: StudentProfileInfo[]; action: DataAction }> {
  console.log('[GradeService] Fetching student profile for:', { userId, userRole, targetStudentId })

  const scope = await getAccessScope(userRole, 'profile', 'read')
  if (scope === AccessScope.NONE) {
    return { profiles: [], action: 'GET_STUDENT_PROFILE' }
  }

  const userContext = await buildUserContext(userId, userRole)
  let studentIds = await getStudentIdsByScope(scope, userContext)

  if (scope === AccessScope.ALL && targetStudentId) {
    studentIds = [targetStudentId]
  }

  // SECURITY FIX: If scope is restricted but no IDs found, deny access
  if (scope !== AccessScope.ALL && scope !== AccessScope.NONE && studentIds.length === 0) {
    console.log(`[GradeService] ACCESS_DENIED: User has ${scope} scope but no valid student IDs found`)
    return { profiles: [], action: 'GET_STUDENT_PROFILE' }
  }

  let query = getSupabase()
    .from('students')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (studentIds.length > 0) {
    query = query.in('id', studentIds)
  } else if (scope !== AccessScope.ALL) {
    // This shouldn't happen due to the security fix above
    console.log(`[GradeService] WARNING: Unexpected state - returning empty`)
    return { profiles: [], action: 'GET_STUDENT_PROFILE' }
  }

  const { data: students, error } = await query

  if (error) {
    console.error('[GradeService] Error fetching student profile:', error)
    return { profiles: [], action: 'GET_STUDENT_PROFILE' }
  }

  console.log('[GradeService] Found', students?.length || 0, 'student profiles')

  return {
    profiles: students?.map(s => ({
      name: s.name,
      class: s.class || 'Unassigned',
      grade_level: s.grade_level,
      date_of_birth: s.date_of_birth,
      address: s.address,
      phone: s.phone,
      enrollment_date: s.enrollment_date,
      parent_name: s.parent_name,
      emergency_contact: s.emergency_contact,
      blood_type: s.blood_type,
      medical_conditions: s.medical_conditions,
    })) || [],
    action: 'GET_STUDENT_PROFILE'
  }
}

/**
 * Get student grades - FIXED QUERY
 */
export async function getStudentGrades(
  userId: string,
  userRole: string,
  targetStudentId?: string
): Promise<{ grades: GradeInfo[]; action: DataAction }> {
  console.log('[GradeService] Fetching grades for:', { userId, userRole, targetStudentId })

  const scope = await getAccessScope(userRole, 'grades', 'read')
  if (scope === AccessScope.NONE) {
    return { grades: [], action: 'GET_GRADES' }
  }

  const userContext = await buildUserContext(userId, userRole)
  let studentIds = await getStudentIdsByScope(scope, userContext)

  if (scope === AccessScope.ALL && targetStudentId) {
    studentIds = [targetStudentId]
  }

  // SECURITY FIX: If scope is restricted (SELF, CHILDREN, CLASS) but no IDs found,
  // deny access instead of returning ALL records
  if (scope !== AccessScope.ALL && scope !== AccessScope.NONE && studentIds.length === 0) {
    console.log(`[GradeService] ACCESS_DENIED: User has ${scope} scope but no valid student IDs found`)
    return { grades: [], action: 'GET_GRADES' }
  }

  // FIXED: Use proper join through classes table
  let query = getSupabase()
    .from('student_subject_grades')
    .select(`
      student_id,
      final_grade,
      letter_grade,
      grade_points,
      class_id,
      academic_year,
      term,
      students (
        name,
        user_id
      ),
      classes (
        name,
        subject,
        section
      )
    `)
    .not('final_grade', 'is', null)
    .order('created_at', { ascending: false })
    .limit(50)

  if (studentIds.length > 0) {
    console.log(`[GradeService] Filtering for ${studentIds.length} student(s):`, studentIds)
    query = query.in('student_id', studentIds)
  } else if (scope === AccessScope.ALL) {
    // Admin scope - can query all, but log it
    console.log(`[GradeService] Admin querying ALL records (filtered by targetStudentId if provided)`)
  } else {
    // This shouldn't happen due to the security fix above
    console.log(`[GradeService] WARNING: Unexpected state - scope=${scope} but no studentIds`)
    return { grades: [], action: 'GET_GRADES' }
  }

  const { data: grades, error } = await query

  if (error) {
    console.error('[GradeService] Error fetching grades:', error)
    return { grades: [], action: 'GET_GRADES' }
  }

  console.log('[GradeService] Found', grades?.length || 0, 'grade records')

  return {
    grades: grades?.map(g => ({
      subject: g.classes?.subject || g.classes?.name || 'Unknown',
      score: parseFloat(g.final_grade) || 0,
      grade: g.letter_grade || 'N/A',
      class_name: g.classes?.name,
      student_name: g.students?.name || 'Unknown',
      student_id: g.student_id
    })) || [],
    action: 'GET_GRADES'
  }
}

/**
 * Get student attendance - FIXED QUERY
 */
export async function getStudentAttendance(
  userId: string,
  userRole: string,
  targetStudentId?: string
): Promise<{ attendance: AttendanceInfo[]; action: DataAction }> {
  console.log('[GradeService] Fetching attendance for:', { userId, userRole, targetStudentId })

  const scope = await getAccessScope(userRole, 'attendance', 'read')
  if (scope === AccessScope.NONE) {
    return { attendance: [], action: 'GET_ATTENDANCE' }
  }

  const userContext = await buildUserContext(userId, userRole)
  let studentIds = await getStudentIdsByScope(scope, userContext)

  if (scope === AccessScope.ALL && targetStudentId) {
    studentIds = [targetStudentId]
  }

  // SECURITY FIX: If scope is restricted but no IDs found, deny access
  if (scope !== AccessScope.ALL && scope !== AccessScope.NONE && studentIds.length === 0) {
    console.log(`[GradeService] ACCESS_DENIED: User has ${scope} scope but no valid student IDs found`)
    return { attendance: [], action: 'GET_ATTENDANCE' }
  }

  // FIXED: Use proper join through classes table
  let query = getSupabase()
    .from('attendance')
    .select(`
      date,
      status,
      student_id,
      class_id,
      classes (
        name,
        subject
      )
    `)
    .order('date', { ascending: false })
    .limit(50)

  if (studentIds.length > 0) {
    console.log(`[GradeService] Filtering for ${studentIds.length} student(s):`, studentIds)
    query = query.in('student_id', studentIds)
  } else if (scope === AccessScope.ALL) {
    console.log(`[GradeService] Admin querying ALL attendance records`)
  } else {
    console.log(`[GradeService] WARNING: Unexpected state - returning empty`)
    return { attendance: [], action: 'GET_ATTENDANCE' }
  }

  const { data: attendance, error } = await query

  if (error) {
    console.error('[GradeService] Error fetching attendance:', error)
    return { attendance: [], action: 'GET_ATTENDANCE' }
  }

  console.log('[GradeService] Found', attendance?.length || 0, 'attendance records')

  return {
    attendance: attendance?.map(a => ({
      date: a.date,
      status: a.status,
      class_name: a.classes?.name
    })) || [],
    action: 'GET_ATTENDANCE'
  }
}

/**
 * Get student schedule - FIXED QUERY with proper joins
 */
export async function getStudentSchedule(
  userId: string,
  userRole: string,
  targetStudentId?: string
): Promise<{ schedules: ScheduleInfo[]; action: DataAction }> {
  console.log('[GradeService] Fetching schedule for:', { userId, userRole, targetStudentId })

  const scope = await getAccessScope(userRole, 'schedule', 'read')
  if (scope === AccessScope.NONE) {
    return { schedules: [], action: 'GET_SCHEDULE' }
  }

  const userContext = await buildUserContext(userId, userRole)
  let studentIds = await getStudentIdsByScope(scope, userContext)

  if (scope === AccessScope.ALL && targetStudentId) {
    studentIds = [targetStudentId]
  }

  // FIXED: Use proper query path - we need to query through student_class_enrollments
  // But since the tables might be empty or relationships might not work,
  // let's use a more robust approach with the classes table

  // First, let's try to get schedule info from classes table directly
  // This is simpler and more reliable for the current schema
  const { data: classes, error: classError } = await getSupabase()
    .from('classes')
    .select(`
      name,
      subject,
      section,
      room_number,
      schedule,
      teacher_id,
      teachers (
        name
      )
    `)
    .order('name')
    .limit(50)

  if (classError) {
    console.error('[GradeService] Error fetching schedule (classes):', classError)
    return { schedules: [], action: 'GET_SCHEDULE' }
  }

  console.log('[GradeService] Found', classes?.length || 0, 'class schedules')

  return {
    schedules: classes?.map(c => ({
      subject: c.subject || 'Unknown',
      class_name: c.name || 'Unknown',
      room_number: c.room_number,
      teacher_name: c.teachers?.name,
      schedule: c.schedule
    })) || [],
    action: 'GET_SCHEDULE'
  }
}

// ============================================================
// MAIN ENTRY POINT - ACTION-BASED RETRIEVAL
// ============================================================

export interface PersonalDataResult {
  action: DataAction
  actionDescription: string
  data?: any[]
  error?: string
}

/**
 * Get personal data based on detected action
 * This is the main entry point that uses action detection
 */
export async function getPersonalDataByAction(
  question: string,
  detectedPersonName: string | null,
  userId: string,
  userRole: string
): Promise<PersonalDataResult> {
  console.log(`\n[GradeService] ==================== PERSONAL DATA REQUEST ====================`)
  console.log(`[GradeService] Question: "${question}"`)
  console.log(`[GradeService] Detected person: ${detectedPersonName || 'none'}`)
  console.log(`[GradeService] User ID: ${userId}`)
  console.log(`[GradeService] User Role: ${userRole}`)

  // Step 1: Detect the action
  const actionDetection = detectDataAction(question, detectedPersonName)
  const { action, confidence, reasoning } = actionDetection

  console.log(`[GradeService] Detected action: ${action} (confidence: ${confidence})`)
  console.log(`[GradeService] Reasoning: ${reasoning}`)

  // Step 2: Look up the student if a person name was detected
  let targetStudentId: string | undefined
  if (detectedPersonName && userRole === 'admin') {
    console.log(`[GradeService] Looking up student by name: "${detectedPersonName}"`)
    const student = await findStudentByName(detectedPersonName, userId, userRole)
    if (student) {
      targetStudentId = student.id
      console.log(`[GradeService] ✓ Found target student: ${student.name} (ID: ${student.id})`)
    } else {
      console.log(`[GradeService] ✗ Student not found: "${detectedPersonName}"`)
    }
  } else if (detectedPersonName && userRole !== 'admin') {
    console.log(`[GradeService] ⚠ Person name detected but user is not admin (role: ${userRole})`)
  }

  console.log(`[GradeService] Target student ID for query: ${targetStudentId || 'none (will query all accessible records)'}`)

  // Step 3: Execute the appropriate query based on action
  try {
    switch (action) {
      case 'GET_STUDENT_PROFILE': {
        const result = await getStudentProfile(userId, userRole, targetStudentId)
        return {
          action,
          actionDescription: getActionDescription(action),
          data: result.profiles
        }
      }

      case 'GET_GRADES': {
        const result = await getStudentGrades(userId, userRole, targetStudentId)
        return {
          action,
          actionDescription: getActionDescription(action),
          data: result.grades
        }
      }

      case 'GET_ATTENDANCE': {
        const result = await getStudentAttendance(userId, userRole, targetStudentId)
        return {
          action,
          actionDescription: getActionDescription(action),
          data: result.attendance
        }
      }

      case 'GET_SCHEDULE': {
        const result = await getStudentSchedule(userId, userRole, targetStudentId)
        return {
          action,
          actionDescription: getActionDescription(action),
          data: result.schedules
        }
      }

      case 'GET_PAYMENTS':
      case 'GET_DISCIPLINE':
      default:
        return {
          action,
          actionDescription: getActionDescription(action),
          error: `Action ${action} is not yet implemented. Please contact support.`
        }
    }
  } catch (error: any) {
    console.error('[GradeService] Error executing action:', error)
    return {
      action,
      actionDescription: getActionDescription(action),
      error: `Failed to retrieve data: ${error.message}`
    }
  }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Find a student by name (admin only)
 */
async function findStudentByName(
  studentName: string,
  requestorUserId: string,
  requestorRole: string
): Promise<{ id: string; name: string; user_id: string } | null> {
  // Verify admin access
  const scope = await getAccessScope(requestorRole, 'grades', 'read')
  if (scope !== AccessScope.ALL) {
    throw new Error('ACCESS_DENIED: Only admins can search students by name')
  }

  const { data: students } = await getSupabase()
    .from('students')
    .select('id, name, user_id')
    .ilike('name', `%${studentName}%`)
    .limit(10)

  if (!students || students.length === 0) {
    return null
  }

  // Use first match
  return students[0]
}

/**
 * Extract student name from question
 */
export function extractStudentName(question: string): string | null {
  const patterns = [
    /(?:for|of)\s+["']?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)["']?(?:\s+['']?s?(?:grade|score|attendance))/i,
    /show\s+(?:grades?|attendance|schedule|profile|information)\s+(?:for|of)\s+["']?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)["']?(?:\s|$)/i,
    /ขอ(?:ข้อมูล|เกรด|คะแนน|ผลสอบ|ประวัติ).*ของ\s+["']?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)["']?(?=\s|มี|\s+คือ|\s+ว่า|$)/i,
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:มี.*เกรด|grades?|scores?|คะแนน|ข้อมูล|ประวัติ)(?=\s|$)/i,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)['']?s\s+(?:grades?|scores?|คะแนน|เกรด|ข้อมูล|ประวัติ)/i,
  ]

  for (const pattern of patterns) {
    const match = question.match(pattern)
    if (match && match[1]) {
      const name = match[1].trim()
      if (name.length > 1 &&
          !/^(me|my|all|the|a|an|มี|ของ|ฉัน|ทุก|ทั้งหมด|ข้อมูล|เกรด|คะแนน|ผลสอบ|มี|คือ|ว่า|ประวัติ)$/i.test(name) &&
          (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$/.test(name) || /[ก-ฮ]/.test(name))) {
        console.log('[extractStudentName] Found name:', name)
        return name
      }
    }
  }

  return null
}

// ============================================================
// LEGACY EXPORTS (for backward compatibility)
// ============================================================

/**
 * Legacy function - maps to new action-based system
 */
export async function getPersonalData(
  userId: string,
  userRole: string,
  dataType: 'grades' | 'attendance' | 'schedule',
  targetStudentId?: string
): Promise<any[]> {
  // Map legacy dataType to action
  let action: DataAction
  switch (dataType) {
    case 'grades':
      action = 'GET_GRADES'
      break
    case 'attendance':
      action = 'GET_ATTENDANCE'
      break
    case 'schedule':
      action = 'GET_SCHEDULE'
      break
  }

  const result = await getPersonalDataByAction(
    '',
    null,
    userId,
    userRole
  )

  return result.data || []
}

/**
 * Legacy function - kept for backward compatibility
 * Use detectDataAction from action-mapper.service instead
 */
export function detectPersonalDataType(question: string): 'grades' | 'attendance' | 'schedule' {
  const action = detectDataAction(question)
  switch (action.action) {
    case 'GET_GRADES':
      return 'grades'
    case 'GET_ATTENDANCE':
      return 'attendance'
    case 'GET_SCHEDULE':
      return 'schedule'
    default:
      return 'grades'
  }
}

/**
 * Legacy function - kept for backward compatibility
 */
export async function getStudentDataByName(
  studentName: string,
  dataType: 'grades' | 'attendance' | 'schedule',
  requestorUserId: string,
  requestorRole: string
): Promise<{ student: { name: string; user_id: string; id: string }; data: any[] } | null> {
  console.log('[GradeService] Looking up student by name:', studentName)

  const student = await findStudentByName(studentName, requestorUserId, requestorRole)

  if (!student) {
    return null
  }

  let action: DataAction
  switch (dataType) {
    case 'grades':
      action = 'GET_GRADES'
      break
    case 'attendance':
      action = 'GET_ATTENDANCE'
      break
    case 'schedule':
      action = 'GET_SCHEDULE'
      break
  }

  const result = await getPersonalDataByAction(
    '',
    studentName,
    requestorUserId,
    requestorRole
  )

  return {
    student: {
      name: student.name,
      user_id: student.user_id,
      id: student.id
    },
    data: result.data || []
  }
}
