/**
 * Synonym Mappings Configuration
 *
 * Centralized synonym mappings for query normalization.
 * This file can be extended or loaded from a database in production.
 */

/**
 * Synonym category
 */
export interface SynonymCategory {
  name: string
  canonical: string
  synonyms: string[]
  languages: ('th' | 'en')[]
}

/**
 * All synonym categories
 */
export const SYNONYM_CATEGORIES: SynonymCategory[] = [
  {
    name: 'grades',
    canonical: 'เกรด',
    synonyms: ['คะแนน', 'ผลการเรียน', 'ผลสอบ', 'gpa', 'grade', 'score', 'scores', 'marks', 'result'],
    languages: ['th', 'en']
  },
  {
    name: 'schedule',
    canonical: 'ตารางเรียน',
    synonyms: ['ตาราง', 'คาบเรียน', 'schedule', 'timetable', 'class schedule', 'weekly schedule'],
    languages: ['th', 'en']
  },
  {
    name: 'attendance',
    canonical: 'การมาเรียน',
    synonyms: ['มาสาย', 'ขาดเรียน', 'ลา', 'การเข้าเรียน', 'attendance', 'absent', 'late', 'present'],
    languages: ['th', 'en']
  },
  {
    name: 'payment',
    canonical: 'ค่าเทอม',
    synonyms: ['ค่าใช้จ่าย', 'ค่าเล่าเรียน', 'ชำระ', 'payment', 'tuition', 'fee', 'fees', 'pay'],
    languages: ['th', 'en']
  },
  {
    name: 'student',
    canonical: 'นักเรียน',
    synonyms: ['นร.', 'student', 'students', 'pupil', 'pupils', 'learner'],
    languages: ['th', 'en']
  },
  {
    name: 'teacher',
    canonical: 'ครู',
    synonyms: ['อาจารย์', 'ผู้สอน', 'teacher', 'teachers', 'instructor', 'professor', 'staff'],
    languages: ['th', 'en']
  },
  {
    name: 'parent',
    canonical: 'ผู้ปกครอง',
    synonyms: ['พ่อแม่', 'parent', 'parents', 'guardian', 'father', 'mother'],
    languages: ['th', 'en']
  },
  {
    name: 'exam',
    canonical: 'สอบ',
    synonyms: ['ปลายภาค', 'กลางภาค', 'สอบไล่', 'สอบแก้ตัว', 'exam', 'exams', 'test', 'tests', 'quiz', 'final', 'midterm'],
    languages: ['th', 'en']
  },
  {
    name: 'discipline',
    canonical: 'วินัย',
    synonyms: ['ทำโทษ', 'ระงับ', 'ความประพฤติ', 'discipline', 'punishment', 'suspension', 'warning'],
    languages: ['th', 'en']
  },
  {
    name: 'count',
    canonical: 'จำนวน',
    synonyms: ['กี่', 'ทั้งหมด', 'หมด', 'how many', 'count', 'total'],
    languages: ['th', 'en']
  },
  {
    name: 'list',
    canonical: 'รายชื่อ',
    synonyms: ['ชื่อ', 'ทั้งหมด', 'list', 'all', 'show all'],
    languages: ['th', 'en']
  },
  {
    name: 'information',
    canonical: 'ข้อมูล',
    synonyms: ['info', 'information', 'detail', 'details', 'รายละเอียด'],
    languages: ['th', 'en']
  },
  {
    name: 'rules',
    canonical: 'กฎ',
    synonyms: ['กติกา', 'ระเบียบ', 'ข้อบังคับ', 'policy', 'rule', 'rules', 'regulation', 'guideline'],
    languages: ['th', 'en']
  },
  {
    name: 'class',
    canonical: 'ห้องเรียน',
    synonyms: ['ห้อง', 'class', 'classroom', 'room'],
    languages: ['th', 'en']
  },
  {
    name: 'subject',
    canonical: 'วิชา',
    synonyms: ['วิชาเรียน', 'subject', 'subjects', 'course', 'courses'],
    languages: ['th', 'en']
  },
  {
    name: 'library',
    canonical: 'ห้องสมุด',
    synonyms: ['library', 'lib'],
    languages: ['en', 'th']
  },
  {
    name: 'cafeteria',
    canonical: 'โรงอาหาร',
    synonyms: ['canteen', 'cafeteria', 'โรงอาหาร'],
    languages: ['en', 'th']
  }
]

/**
 * Get synonym mappings as a Map
 */
export function getSynonymMap(): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const category of SYNONYM_CATEGORIES) {
    map.set(category.canonical, category.synonyms)
  }
  return map
}

/**
 * Get all synonyms for a canonical term
 */
export function getSynonyms(canonical: string): string[] {
  const category = SYNONYM_CATEGORIES.find(c => c.canonical === canonical)
  return category?.synonyms || []
}

/**
 * Find canonical term from a synonym
 */
export function findCanonical(synonym: string): string | null {
  const lower = synonym.toLowerCase()
  for (const category of SYNONYM_CATEGORIES) {
    if (category.canonical === lower) {
      return category.canonical
    }
    for (const s of category.synonyms) {
      if (s.toLowerCase() === lower) {
        return category.canonical
      }
    }
  }
  return null
}
