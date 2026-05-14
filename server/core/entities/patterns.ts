/**
 * Entity Extraction Patterns
 *
 * Centralized regex patterns for entity extraction.
 * Consolidated from intent.service.ts and grade.service.ts
 */

import { EntityPattern } from './entity.types.js'

/**
 * Person name patterns
 */
export const PERSON_NAME_PATTERNS: EntityPattern[] = [
  {
    // Thai name pattern: 2-3 Thai words, starts with capital Thai consonant
    pattern: /[ก-ฮ][ก-๙\s]{2,20}/g,
    confidence: 0.85
  },
  {
    // English name pattern: First Last (2+ words, starts with capital)
    pattern: /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g,
    confidence: 0.85
  },
  {
    // Full name with middle: First Middle Last
    pattern: /\b[A-Z][a-z]+\s+[A-Z]\.?\s+[A-Z][a-z]+\b/g,
    confidence: 0.85
  },
  {
    // Thai-English mixed name
    pattern: /[ก-ฮก-๙]{2,}\s+[A-Z][a-z]+/g,
    confidence: 0.75
  },
  {
    // English-Thai mixed name
    pattern: /[A-Z][a-z]+\s+[ก-ฮก-๙]{2,}/g,
    confidence: 0.75
  }
]

/**
 * Student ID patterns
 */
export const STUDENT_ID_PATTERNS: EntityPattern[] = [
  {
    // Generic numeric ID: 6-10 digits
    pattern: /\b\d{6,10}\b/g,
    confidence: 0.7,
    validator: (match) => {
      // Exclude if it's a 3-digit room number
      return !/^\d{3}$/.test(match)
    }
  },
  {
    // ID with prefix: A-Z + digits
    pattern: /\b[A-Z]{1,3}\d{4,8}\b/g,
    confidence: 0.9
  },
  {
    // Thai school format: ####-####
    pattern: /\b\d{4}-\d{4}\b/g,
    confidence: 0.9
  },
  {
    // Student ID prefix patterns
    pattern: /\b(?:student|นร|นักเรียน)[-:\s]?\d+/gi,
    confidence: 0.85
  }
]

/**
 * Teacher ID patterns
 */
export const TEACHER_ID_PATTERNS: EntityPattern[] = [
  {
    // T + digits
    pattern: /\bT\d{4,6}\b/gi,
    confidence: 0.95
  },
  {
    // teacher + digits
    pattern: /\bteacher[-:\s]?\d+/gi,
    confidence: 0.9
  },
  {
    // ครู + digits
    pattern: /\bครู[-:\s]?\d+/g,
    confidence: 0.9
  }
]

/**
 * Room/Class patterns
 */
export const ROOM_PATTERNS: EntityPattern[] = [
  {
    // Thai format: ม.1/1, ม.2/3, etc.
    pattern: /\bม\.?\s*[\d\/]+/g,
    confidence: 0.85
  },
  {
    // Thai letter + . + number: ก.1, ข.2/1
    pattern: /\b[ก-๛]\.?\s*[\d\/]+/g,
    confidence: 0.85
  },
  {
    // English: Grade 1, Class A, Room 101
    pattern: /\b(?:grade|class|room)\s*\d+/gi,
    confidence: 0.8
  },
  {
    // Room number: 3 digits (but validate it's not a student ID)
    pattern: /\b\d{3}\b/g,
    confidence: 0.6,
    validator: (match, context) => {
      // Only consider it a room if accompanied by room-related words
      return context.some((word: string) =>
        /ห้อง|room|class|classroom|ชั้น/gi.test(word)
      )
    }
  },
  {
    // ห้อง + number
    pattern: /ห้อง\s*\d+/g,
    confidence: 0.9
  }
]

/**
 * Subject patterns
 */
export const SUBJECT_PATTERNS: EntityPattern[] = [
  {
    // Thai subjects
    pattern: /คณิตศาสตร์|วิทยาศาสตร์|ภาษาไทย|ภาษาอังกฤษ|สังคม|ศิลปะ|การงาน|พลศึกษา|ประวัติศาสตร์|ภูมิศาสตร์|ชีววิทยา|เคมี|ฟิสิกส์|คณิต|วิทย์/g,
    confidence: 0.9
  },
  {
    // English subjects
    pattern: /\b(?:math|mathematics|english|science|history|geography|biology|chemistry|physics|art|music|pe|physical education|literature)\b/gi,
    confidence: 0.9
  },
  {
    // Subject codes (e.g., M101, SCI201)
    pattern: /\b[A-Z]{2,4}\d{3}\b/g,
    confidence: 0.75,
    validator: (match) => {
      // Likely a subject code if it has letters followed by numbers
      return /^[A-Z]{2,4}\d{3}$/.test(match)
    }
  }
]

/**
 * Date patterns
 */
export const DATE_PATTERNS: EntityPattern[] = [
  {
    // Thai date: 12 ม.ค. 2024, 12 มกราคม 2024
    pattern: /\d{1,2}\s+(?:ม\.?ค\.?|มกราคม|ก\.?พ\.?|กุมภาพันธ์|มี\.?ค\.?|มีนาคม|เม\.?ย\.?|เมษายน|พ\.?ค\.?|พฤษภาคม|มิ\.?ย\.?|มิถุนายน|ก\.?ค\.?|กรกฎาคม|ส\.?ค\.?|สิงหาคม|ก\.?ย\.?|กันยายน|ต\.?ค\.?|ตุลาคม|พ\.?ย\.?|พฤศจิกายน|ธ\.?ค\.?|ธันวาคม)\s+\d{4}/g,
    confidence: 0.9
  },
  {
    // English date: January 12, 2024, Jan 12 2024
    pattern: /\b(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}/gi,
    confidence: 0.9
  },
  {
    // ISO date: 2024-01-12
    pattern: /\b\d{4}-\d{2}-\d{2}\b/g,
    confidence: 0.85
  },
  {
    // Thai date: 12/01/2567 or 12-01-2567
    pattern: /\b\d{1,2}[/-]\d{1,2}[/-]\d{4}\b/g,
    confidence: 0.7,
    validator: (match) => {
      const parts = match.split(/[/-]/)
      if (parts.length === 3) {
        const year = parseInt(parts[2], 10)
        // Thai year (2567-2650) or English year (2024-2100)
        return (year >= 2567 && year <= 2650) || (year >= 2024 && year <= 2100)
      }
      return false
    }
  },
  {
    // Relative dates: today, tomorrow, yesterday
    pattern: /\b(?:today|tomorrow|yesterday|วันนี้|พรุ่งนี้|เมื่อวาน)\b/gi,
    confidence: 0.95
  }
]

/**
 * Semester patterns
 */
export const SEMESTER_PATTERNS: EntityPattern[] = [
  {
    // Semester 1, 2, etc.
    pattern: /\b(?:semester|ภาคเรียน|เทอม)[-:\s]?\s*\d+/gi,
    confidence: 0.9
  },
  {
    // 1/2567, 2/2568 (semester/year format)
    pattern: /\b[12]\/\d{4}\b/g,
    confidence: 0.85
  },
  {
    // First semester, second semester (Thai)
    pattern: /ภาคเรียนที่\s*\d+|เทอม\s*\d+/g,
    confidence: 0.9
  }
]

/**
 * Words to exclude from entity extraction (common false positives)
 */
export const EXCLUDED_WORDS = new Set([
  // Articles and prepositions
  'the', 'a', 'an', 'and', 'or', 'but', 'with', 'for', 'of', 'in', 'on', 'at', 'to', 'by',
  'ที่', 'ของ', 'และ', 'หรือ', 'กับ', 'ใน', 'ที่', 'จาก',

  // Common school terms (not entities)
  'นักเรียน', 'ครู', 'ผู้ปกครอง', 'โรงเรียน', 'school', 'student', 'teacher', 'parent',

  // Numbers (standalone)
  'one', 'two', 'three',
  'หนึ่ง', 'สอง', 'สาม',

  // Common words that might match patterns
  'this', 'that', 'these', 'those',
  'นี้', 'นั้น', 'เหล่านี้',

  // Query words
  'what', 'where', 'when', 'who', 'how', 'why',
  'อะไร', 'ที่ไหน', 'เมื่อไหร่', 'ใคร', 'อย่างไร', 'ทำไม'
])

/**
 * School-related keywords for context
 */
export const SCHOOL_KEYWORDS = {
  // People
  people: ['นักเรียน', 'ครู', 'อาจารย์', 'ผู้สอน', 'ผู้ปกครอง', 'student', 'teacher', 'parent'],

  // Academic
  academic: ['ห้องเรียน', 'วิชา', 'เกรด', 'คะแนน', 'class', 'subject', 'grade', 'score'],

  // Schedule
  schedule: ['ตารางเรียน', 'ตาราง', 'คาบเรียน', 'schedule', 'timetable'],

  // Attendance
  attendance: ['การมาเรียน', 'มาสาย', 'ขาดเรียน', 'ลา', 'attendance', 'absent', 'late'],

  // Facilities
  facilities: ['ห้องสมุด', 'โรงอาหาร', 'ห้องพยาบาล', 'library', 'cafeteria', 'clinic']
}
