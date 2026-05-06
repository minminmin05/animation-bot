import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// Student personal data types
export interface StudentGrades {
  student_name: string
  grades: {
    class_name: string
    subject: string
    assignment_title?: string
    points_earned?: number
    max_points?: number
    percentage?: number
    letter_grade?: string
    semester?: string
    academic_year?: string
  }[]
  gpa?: number
  summary: {
    total_assignments: number
    average_percentage: number
    graded_count: number
  }
}

export interface StudentAttendance {
  student_name: string
  attendance: {
    date: string
    status: 'present' | 'absent' | 'late' | 'excused'
    class_name?: string
    notes?: string
  }[]
  summary: {
    total_days: number
    present: number
    absent: number
    late: number
    excused: number
    attendance_rate: number
  }
}

export interface StudentSchedule {
  student_name: string
  enrollments: {
    class_name: string
    subject: string
    section?: string
    room_number?: string
    schedule?: string
    teacher_name?: string
    credits?: number
    status: string
  }[]
  summary: {
    total_classes: number
    total_credits: number
  }
}

/**
 * Get student's user_id from their auth context
 * This verifies the user is who they claim to be
 */
async function getStudentUserId(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('students')
    .select('id, user_id, name')
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    console.error('[PersonalData] Student not found:', error)
    return null
  }

  return data.id
}

/**
 * Get student's grades (secure - only their own data)
 */
export async function getStudentGrades(userId: string): Promise<StudentGrades | null> {
  // First get the student's internal ID
  const studentId = await getStudentUserId(userId)
  if (!studentId) return null

  // Get student name
  const { data: student } = await supabase
    .from('students')
    .select('name')
    .eq('user_id', userId)
    .single()

  if (!student) return null

  // Get grades with class information
  const { data: grades, error } = await supabase
    .from('student_grades')
    .select(`
      points_earned,
      percentage,
      letter_grade,
      submitted_at,
      assignments (
        title,
        max_points,
        class_section_id,
        class_sections (
          name,
          subject,
          academic_year_id,
          semester_id
        )
      )
    `)
    .eq('student_id', studentId)
    .not('points_earned', 'is', null)

  if (error) {
    console.error('[PersonalData] Error fetching grades:', error)
    return null
  }

  // Format the data
  const formattedGrades = grades?.map(g => ({
    class_name: g.assignments?.class_sections?.name || 'Unknown',
    subject: g.assignments?.class_sections?.subject || 'Unknown',
    assignment_title: g.assignments?.title,
    points_earned: g.points_earned,
    max_points: g.assignments?.max_points,
    percentage: g.percentage,
    letter_grade: g.letter_grade
  })) || []

  // Calculate summary
  const gradedCount = formattedGrades.filter(g => g.percentage !== null).length
  const avgPercentage = gradedCount > 0
    ? formattedGrades.reduce((sum, g) => sum + (g.percentage || 0), 0) / gradedCount
    : 0

  return {
    student_name: student.name,
    grades: formattedGrades,
    summary: {
      total_assignments: formattedGrades.length,
      average_percentage: Math.round(avgPercentage * 100) / 100,
      graded_count: gradedCount
    }
  }
}

/**
 * Get student's attendance (secure - only their own data)
 */
export async function getStudentAttendance(userId: string): Promise<StudentAttendance | null> {
  const studentId = await getStudentUserId(userId)
  if (!studentId) return null

  // Get student name
  const { data: student } = await supabase
    .from('students')
    .select('name')
    .eq('user_id', userId)
    .single()

  if (!student) return null

  // Get attendance records
  const { data: attendance, error } = await supabase
    .from('attendance')
    .select(`
      date,
      status,
      notes,
      classes (
        name,
        subject
      )
    `)
    .eq('student_id', studentId)
    .order('date', { ascending: false })
    .limit(50)

  if (error) {
    console.error('[PersonalData] Error fetching attendance:', error)
    return null
  }

  // Format the data
  const formattedAttendance = attendance?.map(a => ({
    date: a.date,
    status: a.status,
    class_name: a.classes?.name,
    notes: a.notes
  })) || []

  // Calculate summary
  const summary = {
    total_days: formattedAttendance.length,
    present: formattedAttendance.filter(a => a.status === 'present').length,
    absent: formattedAttendance.filter(a => a.status === 'absent').length,
    late: formattedAttendance.filter(a => a.status === 'late').length,
    excused: formattedAttendance.filter(a => a.status === 'excused').length,
    attendance_rate: 0
  }

  if (summary.total_days > 0) {
    summary.attendance_rate = Math.round(
      ((summary.present + summary.excused) / summary.total_days) * 100
    )
  }

  return {
    student_name: student.name,
    attendance: formattedAttendance,
    summary
  }
}

/**
 * Get student's class schedule (secure - only their own data)
 */
export async function getStudentSchedule(userId: string): Promise<StudentSchedule | null> {
  const studentId = await getStudentUserId(userId)
  if (!studentId) return null

  // Get student name
  const { data: student } = await supabase
    .from('students')
    .select('name')
    .eq('user_id', userId)
    .single()

  if (!student) return null

  // Get current enrollments
  const { data: enrollments, error } = await supabase
    .from('student_class_enrollments')
    .select(`
      status,
      credits_earned,
      class_sections (
        name,
        subject,
        section,
        room_number,
        schedule,
        academic_year_id,
        semester_id
      ),
      teacher_class_assignments (
        teachers (
          name
        )
      )
    `)
    .eq('student_id', studentId)
    .eq('status', 'active')

  if (error) {
    console.error('[PersonalData] Error fetching schedule:', error)
    return null
  }

  // Format the data
  const formattedEnrollments = enrollments?.map(e => ({
    class_name: e.class_sections?.name || 'Unknown',
    subject: e.class_sections?.subject || 'Unknown',
    section: e.class_sections?.section,
    room_number: e.class_sections?.room_number,
    schedule: e.class_sections?.schedule,
    teacher_name: e.teacher_class_assignments?.[0]?.teachers?.name,
    credits: e.credits_earned,
    status: e.status
  })) || []

  return {
    student_name: student.name,
    enrollments: formattedEnrollments,
    summary: {
      total_classes: formattedEnrollments.length,
      total_credits: formattedEnrollments.reduce((sum, e) => sum + (e.credits || 0), 0)
    }
  }
}

/**
 * Get personal data based on query type
 */
export async function getPersonalData(
  userId: string,
  queryType: 'grades' | 'attendance' | 'schedule' | 'all'
): Promise<{ grades?: StudentGrades; attendance?: StudentAttendance; schedule?: StudentSchedule } | null> {
  const result: any = {}

  if (queryType === 'grades' || queryType === 'all') {
    result.grades = await getStudentGrades(userId)
  }

  if (queryType === 'attendance' || queryType === 'all') {
    result.attendance = await getStudentAttendance(userId)
  }

  if (queryType === 'schedule' || queryType === 'all') {
    result.schedule = await getStudentSchedule(userId)
  }

  // If all queries failed, return null
  if (Object.keys(result).length === 0 || Object.values(result).every(v => v === null)) {
    return null
  }

  return result
}

/**
 * Detect what type of personal data is being requested from the question
 */
export function detectPersonalDataType(question: string): 'grades' | 'attendance' | 'schedule' | 'all' {
  const q = question.toLowerCase()

  // Check for grades
  if (/grade|score|gpa|คะแนน|เกรด|สอบ|ผลการเรียน|academic/.test(q)) {
    return 'grades'
  }

  // Check for attendance
  if (/attendance|absent|present|late|มาเรียน|ขาด|สาย|ลา/.test(q)) {
    return 'attendance'
  }

  // Check for schedule
  if (/schedule|class|subject|timetable|ตาราง|คลาส|วิชา|เรียน/.test(q)) {
    return 'schedule'
  }

  return 'all'
}

/**
 * Format personal data for LLM consumption
 */
export function formatPersonalDataForLLM(
  data: ReturnType<typeof getPersonalData> extends Promise<infer T> ? T : never,
  queryType: string
): string {
  if (!data) return 'ไม่พบข้อมูล (No data found)'

  let text = ''

  if (data.grades) {
    const g = data.grades
    text += `ข้อมูลผลการเรียน (Grades) สำหรับ ${g.student_name}:\n`
    text += `- จำนวนงานที่ได้รับการคะแนน: ${g.summary.graded_count}/${g.summary.total_assignments}\n`
    text += `- คะแนนเฉลี่ย: ${g.summary.average_percentage}%\n`

    if (g.grades.length > 0) {
      text += `\nรายละเอียด (Recent grades):\n`
      g.grades.slice(0, 5).forEach(grade => {
        text += `  • ${grade.subject}: ${grade.percentage || 'N/A'}% (${grade.letter_grade || 'N/A'})\n`
      })
    }
    text += '\n'
  }

  if (data.attendance) {
    const a = data.attendance
    text += `ข้อมูลการมาเรียน (Attendance) สำหรับ ${a.student_name}:\n`
    text += `- มาเรียน: ${a.summary.present} วัน\n`
    text += `- ขาดเรียน: ${a.summary.absent} วัน\n`
    text += `- สาย: ${a.summary.late} วัน\n`
    text += `- ลา: ${a.summary.excused} วัน\n`
    text += `- อัตราการมาเรียน: ${a.summary.attendance_rate}%\n`
    text += '\n'
  }

  if (data.schedule) {
    const s = data.schedule
    text += `ตารางเรียน (Class Schedule) สำหรับ ${s.student_name}:\n`
    text += `- จำนวนวิชาทั้งหมด: ${s.summary.total_classes} วิชา\n`
    text += `- หน่วยกิตรวม: ${s.summary.total_credits}\n`

    if (s.enrollments.length > 0) {
      text += `\nรายวิชา (Classes):\n`
      s.enrollments.forEach(e => {
        text += `  • ${e.subject} (${e.class_name})`
        if (e.room_number) text += ` - ห้อง ${e.room_number}`
        if (e.teacher_name) text += ` - ครู ${e.teacher_name}`
        text += `\n`
      })
    }
  }

  return text
}
