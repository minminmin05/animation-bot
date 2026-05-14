/**
 * Action Mapper Service
 * Maps user queries to specific data retrieval actions with proper semantic separation.
 *
 * Actions:
 * - GET_STUDENT_PROFILE: General student information (name, class, grade level, etc.)
 * - GET_SCHEDULE: Class schedule/timetable
 * - GET_GRADES: Grades, scores, GPA
 * - GET_ATTENDANCE: Attendance records
 * - GET_PAYMENTS: Tuition/payment information
 * - GET_DISCIPLINE: Disciplinary records
 */

export type DataAction =
  | 'GET_STUDENT_PROFILE'
  | 'GET_SCHEDULE'
  | 'GET_GRADES'
  | 'GET_ATTENDANCE'
  | 'GET_PAYMENTS'
  | 'GET_DISCIPLINE'

interface ActionMapping {
  action: DataAction
  confidence: number
  reasoning: string
}

interface ActionDetectionResult {
  action: DataAction
  confidence: number
  reasoning: string
  detectedKeywords: string[]
  detectedEntities: string[]
}

/**
 * Keyword patterns for each action type
 * Ordered by priority (more specific patterns first)
 */
const ACTION_PATTERNS = {
  // GET_STUDENT_PROFILE - General student information
  GET_STUDENT_PROFILE: {
    thai: [
      'ข้อมูลนักเรียน',
      'ข้อมูลส่วนตัว',
      'ประวัติ',
      'ข้อมูลทั่วไป',
      'รายละเอียด',
      'นักเรียนชื่อ',
    ],
    english: [
      'student information',
      'student profile',
      'student details',
      'profile',
      'bio',
      'information about',
    ],
    // These trigger ONLY if no other specific keywords are present
    fallback: ['นักเรียน', 'student'],
  },

  // GET_SCHEDULE - Class schedule/timetable (HIGH PRIORITY)
  GET_SCHEDULE: {
    thai: [
      'ตารางเรียน',
      'ตารางสอน',
      'ตาราง',
      'เรียนวันไหน',
      'เรียนเวลา',
      'คลาสเรียน',
      'วิชาที่เรียน',
      'schedule',
    ],
    english: [
      'schedule',
      'timetable',
      'class schedule',
      'when do i have',
      'what time',
      'which period',
    ],
  },

  // GET_GRADES - Grades, scores, GPA (HIGH PRIORITY)
  GET_GRADES: {
    thai: [
      'เกรด',
      'คะแนน',
      'ผลการเรียน',
      'สอบได้',
      'คะแนนสอบ',
      'gpa',
      'เกรดเฉลี่ย',
      'ผลสอบ',
    ],
    english: [
      'grade',
      'grades',
      'score',
      'scores',
      'gpa',
      'academic performance',
      'exam results',
      'test scores',
    ],
  },

  // GET_ATTENDANCE - Attendance records (HIGH PRIORITY)
  GET_ATTENDANCE: {
    thai: [
      'การมาเรียน',
      'ขาดเรียน',
      'มาสาย',
      'ลาเรียน',
      'เข้าเรียน',
      'มาสครบ',
      'วันลา',
      'attendance',
    ],
    english: [
      'attendance',
      'absent',
      'late',
      'present',
      'missed',
      'how many days',
    ],
  },

  // GET_PAYMENTS - Tuition/payment
  GET_PAYMENTS: {
    thai: [
      'ค่าเทอม',
      'ค่าเล่าเรียน',
      'ชำระเงิน',
      'ค้างจ่าย',
      'ใบเสร็จ',
      'payment',
    ],
    english: [
      'tuition',
      'payment',
      'fee',
      'fees',
      'paid',
      'balance',
    ],
  },

  // GET_DISCIPLINE - Disciplinary records
  GET_DISCIPLINE: {
    thai: [
      'พฤติกรรม',
      'ทำโทษ',
      'ระงับ',
      'แจ้งความดี',
      'แจ้งความชั่ว',
      'discipline',
    ],
    english: [
      'discipline',
      'disciplinary',
      'punishment',
      'suspension',
      'warning',
      'behavior',
    ],
  },
}

/**
 * Detect which action the user is requesting
 * Uses priority-based resolution
 */
export function detectDataAction(
  question: string,
  detectedPersonName?: string | null
): ActionDetectionResult {
  const q = question.toLowerCase()
  const originalQ = question

  console.log(`\n[ActionMapper] ==================== ACTION DETECTION START ====================`)
  console.log(`[ActionMapper] Query: "${originalQ}"`)
  if (detectedPersonName) {
    console.log(`[ActionMapper] Detected entity: "${detectedPersonName}"`)
  }

  const detectedKeywords: string[] = []
  const detectedEntities: string[] = []
  if (detectedPersonName) {
    detectedEntities.push(detectedPersonName)
  }

  // ============================================================
  // PRIORITY 1: Check for HIGH PRIORITY action keywords first
  // ============================================================

  // Check GET_SCHEDULE keywords
  const schedulePatterns = [...ACTION_PATTERNS.GET_SCHEDULE.thai, ...ACTION_PATTERNS.GET_SCHEDULE.english]
  for (const pattern of schedulePatterns) {
    if (q.includes(pattern.toLowerCase())) {
      console.log(`[ActionMapper] ✓ Schedule keyword found: "${pattern}"`)
      return {
        action: 'GET_SCHEDULE',
        confidence: 0.9,
        reasoning: `Schedule keyword "${pattern}" detected`,
        detectedKeywords: [pattern],
        detectedEntities,
      }
    }
  }

  // Check GET_GRADES keywords
  const gradePatterns = [...ACTION_PATTERNS.GET_GRADES.thai, ...ACTION_PATTERNS.GET_GRADES.english]
  for (const pattern of gradePatterns) {
    if (q.includes(pattern.toLowerCase())) {
      console.log(`[ActionMapper] ✓ Grade keyword found: "${pattern}"`)
      return {
        action: 'GET_GRADES',
        confidence: 0.9,
        reasoning: `Grade keyword "${pattern}" detected`,
        detectedKeywords: [pattern],
        detectedEntities,
      }
    }
  }

  // Check GET_ATTENDANCE keywords
  const attendancePatterns = [...ACTION_PATTERNS.GET_ATTENDANCE.thai, ...ACTION_PATTERNS.GET_ATTENDANCE.english]
  for (const pattern of attendancePatterns) {
    if (q.includes(pattern.toLowerCase())) {
      console.log(`[ActionMapper] ✓ Attendance keyword found: "${pattern}"`)
      return {
        action: 'GET_ATTENDANCE',
        confidence: 0.9,
        reasoning: `Attendance keyword "${pattern}" detected`,
        detectedKeywords: [pattern],
        detectedEntities,
      }
    }
  }

  // Check GET_PAYMENTS keywords
  const paymentPatterns = [...ACTION_PATTERNS.GET_PAYMENTS.thai, ...ACTION_PATTERNS.GET_PAYMENTS.english]
  for (const pattern of paymentPatterns) {
    if (q.includes(pattern.toLowerCase())) {
      console.log(`[ActionMapper] ✓ Payment keyword found: "${pattern}"`)
      return {
        action: 'GET_PAYMENTS',
        confidence: 0.9,
        reasoning: `Payment keyword "${pattern}" detected`,
        detectedKeywords: [pattern],
        detectedEntities,
      }
    }
  }

  // Check GET_DISCIPLINE keywords
  const disciplinePatterns = [...ACTION_PATTERNS.GET_DISCIPLINE.thai, ...ACTION_PATTERNS.GET_DISCIPLINE.english]
  for (const pattern of disciplinePatterns) {
    if (q.includes(pattern.toLowerCase())) {
      console.log(`[ActionMapper] ✓ Discipline keyword found: "${pattern}"`)
      return {
        action: 'GET_DISCIPLINE',
        confidence: 0.9,
        reasoning: `Discipline keyword "${pattern}" detected`,
        detectedKeywords: [pattern],
        detectedEntities,
      }
    }
  }

  // ============================================================
  // PRIORITY 2: Check for general student profile keywords
  // ============================================================

  // Check for GET_STUDENT_PROFILE specific keywords
  const profilePatterns = [...ACTION_PATTERNS.GET_STUDENT_PROFILE.thai, ...ACTION_PATTERNS.GET_STUDENT_PROFILE.english]
  for (const pattern of profilePatterns) {
    if (q.includes(pattern.toLowerCase())) {
      console.log(`[ActionMapper] ✓ Student profile keyword found: "${pattern}"`)
      return {
        action: 'GET_STUDENT_PROFILE',
        confidence: 0.85,
        reasoning: `Student profile keyword "${pattern}" detected`,
        detectedKeywords: [pattern],
        detectedEntities,
      }
    }
  }

  // ============================================================
  // PRIORITY 3: Fallback - If person entity detected but no specific keywords
  // ============================================================

  if (detectedPersonName) {
    console.log(`[ActionMapper] ⚠ Person entity detected but no specific keywords`)
    console.log(`[ActionMapper] → Defaulting to GET_STUDENT_PROFILE`)
    return {
      action: 'GET_STUDENT_PROFILE',
      confidence: 0.75,
      reasoning: 'Person entity detected, defaulting to student profile',
      detectedKeywords: [],
      detectedEntities: [detectedPersonName],
    }
  }

  // ============================================================
  // PRIORITY 4: Final fallback - Check for fallback patterns
  // ============================================================

  const fallbackPatterns = [...ACTION_PATTERNS.GET_STUDENT_PROFILE.fallback]
  for (const pattern of fallbackPatterns) {
    if (q.includes(pattern.toLowerCase())) {
      console.log(`[ActionMapper] ⚠ Fallback pattern matched: "${pattern}"`)
      console.log(`[ActionMapper] → Defaulting to GET_STUDENT_PROFILE`)
      return {
        action: 'GET_STUDENT_PROFILE',
        confidence: 0.6,
        reasoning: `Fallback pattern "${pattern}" detected, assuming student profile`,
        detectedKeywords: [pattern],
        detectedEntities,
      }
    }
  }

  // ============================================================
  // DEFAULT: If nothing matched, return profile as safest default
  // ============================================================

  console.log(`[ActionMapper] ⚠ No specific action detected`)
  console.log(`[ActionMapper] → Defaulting to GET_STUDENT_PROFILE`)
  return {
    action: 'GET_STUDENT_PROFILE',
    confidence: 0.5,
    reasoning: 'No specific action detected, defaulting to student profile',
    detectedKeywords: [],
    detectedEntities,
  }
}

/**
 * Get a user-friendly description of the action
 */
export function getActionDescription(action: DataAction): string {
  switch (action) {
    case 'GET_STUDENT_PROFILE':
      return 'ข้อมูลนักเรียน (Student Profile)'
    case 'GET_SCHEDULE':
      return 'ตารางเรียน (Class Schedule)'
    case 'GET_GRADES':
      return 'ผลการเรียน (Grades)'
    case 'GET_ATTENDANCE':
      return 'การมาเรียน (Attendance)'
    case 'GET_PAYMENTS':
      return 'ค่าเทอม (Tuition)'
    case 'GET_DISCIPLINE':
      return 'พฤติกรรม/วินัย (Discipline)'
    default:
      return 'ข้อมูล (Information)'
  }
}

/**
 * Legacy function name for backward compatibility
 * Maps to detectPersonalDataType for grades/attendance/schedule
 */
export function mapActionToDataType(action: DataAction): 'grades' | 'attendance' | 'schedule' | 'profile' {
  switch (action) {
    case 'GET_GRADES':
      return 'grades'
    case 'GET_ATTENDANCE':
      return 'attendance'
    case 'GET_SCHEDULE':
      return 'schedule'
    case 'GET_STUDENT_PROFILE':
    case 'GET_PAYMENTS':
    case 'GET_DISCIPLINE':
    default:
      return 'profile'
  }
}
