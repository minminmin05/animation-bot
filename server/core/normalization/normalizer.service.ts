/**
 * Query Normalization Service
 *
 * Normalizes user queries by:
 * - Converting to lowercase
 * - Mapping synonyms to canonical terms
 * - Correcting common typos
 * - Detecting language
 */

import {
  NormalizedQuery,
  EntityExtractionResult
} from '../entities/entity.types.js'

/**
 * Language detection
 */
export type QueryLanguage = 'th' | 'en' | 'mixed' | 'unknown'

/**
 * Synonym group configuration
 */
interface SynonymGroup {
  canonical: string
  synonyms: string[]
}

/**
 * Typo correction mapping
 */
interface TypoMapping {
  typo: string
  correction: string
}

/**
 * Query normalization service
 */
export class QueryNormalizer {
  private synonymGroups: Map<string, string[]>
  private typoMappings: Map<string, string>

  constructor() {
    this.synonymGroups = new Map()
    this.typoMappings = new Map()
    this.loadSynonyms()
    this.loadTypoMappings()
  }

  /**
   * Normalize a query
   */
  normalize(query: string): NormalizedQuery {
    const original = query

    // Step 1: Basic cleanup
    let normalized = query
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[,,]/g, ',') // Fix double commas (Thai-English mix)

    // Detect language before normalization
    const language = this.detectLanguage(normalized)

    // Step 2: Apply typo corrections
    for (const [typo, correction] of this.typoMappings) {
      const regex = new RegExp(this.escapeRegex(typo), 'gi')
      normalized = normalized.replace(regex, correction)
    }

    // Step 3: Track detected synonyms
    const detectedSynonyms: string[] = []

    // Step 4: Apply synonym normalization
    for (const [canonical, synonyms] of this.synonymGroups) {
      for (const synonym of synonyms) {
        const regex = new RegExp(this.escapeRegex(synonym), 'gi')
        if (regex.test(normalized)) {
          detectedSynonyms.push(synonym)
          normalized = normalized.replace(regex, canonical)
        }
      }
    }

    // Step 5: Final cleanup
    normalized = normalized.trim().replace(/\s+/g, ' ')

    return {
      original,
      normalized,
      detectedSynonyms,
      language
    }
  }

  /**
   * Detect the language of a query
   */
  private detectLanguage(query: string): QueryLanguage {
    const thaiChars = (query.match(/[ก-ฮ]/g) || []).length
    const englishChars = (query.match(/[a-zA-Z]/g) || []).length
    const total = thaiChars + englishChars

    if (total === 0) {
      return 'unknown'
    }

    const thaiRatio = thaiChars / total

    if (thaiRatio > 0.8) {
      return 'th'
    } else if (thaiRatio < 0.2) {
      return 'en'
    } else {
      return 'mixed'
    }
  }

  /**
   * Add a synonym group
   */
  private addSynonymGroup(canonical: string, synonyms: string[]): void {
    this.synonymGroups.set(canonical, synonyms)
  }

  /**
   * Add a typo mapping
   */
  private addTypoMapping(typo: string, correction: string): void {
    this.typoMappings.set(typo, correction)
  }

  /**
   * Escape regex special characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  /**
   * Load synonym mappings
   */
  private loadSynonyms(): void {
    // Grade/Score synonyms
    this.addSynonymGroup('เกรด', [
      'คะแนน', 'ผลการเรียน', 'ผลสอบ', 'gpa', 'grade', 'score', 'marks'
    ])

    // Schedule/Timetable synonyms
    this.addSynonymGroup('ตารางเรียน', [
      'ตาราง', 'คาบเรียน', 'schedule', 'timetable', 'class schedule'
    ])

    // Attendance synonyms
    this.addSynonymGroup('การมาเรียน', [
      'มาสาย', 'ขาดเรียน', 'ลา', 'การเข้าเรียน', 'attendance', 'absent', 'late'
    ])

    // Payment/Tuition synonyms
    this.addSynonymGroup('ค่าเทอม', [
      'ค่าใช้จ่าย', 'ค่าเล่าเรียน', 'ชำระ', 'payment', 'tuition', 'fee'
    ])

    // Student synonyms
    this.addSynonymGroup('นักเรียน', [
      'นร.', 'student', 'pupil', 'learner'
    ])

    // Teacher synonyms
    this.addSynonymGroup('ครู', [
      'อาจารย์', 'ผู้สอน', 'teacher', 'instructor', 'professor'
    ])

    // Parent synonyms
    this.addSynonymGroup('ผู้ปกครอง', [
      'พ่อแม่', 'parent', 'guardian', 'father', 'mother'
    ])

    // Exam/Test synonyms
    this.addSynonymGroup('สอบ', [
      'ปลายภาค', 'กลางภาค', 'สอบไล่', 'สอบแก้ตัว', 'exam', 'test', 'quiz', 'final', 'midterm'
    ])

    // Disciplinary synonyms
    this.addSynonymGroup('วินัย', [
      'ทำโทษ', 'ระงับ', 'ความประพฤติ', 'discipline', 'punishment', 'suspension', 'warning'
    ])

    // Count/Statistics synonyms
    this.addSynonymGroup('จำนวน', [
      'กี่', 'ทั้งหมด', 'หมด', 'how many', 'count', 'total'
    ])

    // List synonyms
    this.addSynonymGroup('รายชื่อ', [
      'ชื่อ', 'ทั้งหมด', 'list', 'all', 'show all'
    ])

    // Knowledge synonyms
    this.addSynonymGroup('ข้อมูล', [
      'info', 'information', 'detail', 'details', 'รายละเอียด'
    ])

    // Policy/Rule synonyms
    this.addSynonymGroup('กฎ', [
      'กติกา', 'ระเบียบ', 'ข้อบังคับ', 'policy', 'rule', 'regulation', 'guideline'
    ])
  }

  /**
   * Load typo mappings
   */
  private loadTypoMappings(): void {
    // Common Thai typos
    this.addTypoMapping('นร', 'นักเรียน')
    this.addTypoMapping('ครูๆ', 'ครู')
    this.addTypoMapping('โรงเรียนน', 'โรงเรียน')
    this.addTypoMapping('ตารางย', 'ตาราง')
    this.addTypoMapping('ตารางเรียนน', 'ตารางเรียน')

    // Common English typos
    this.addTypoMapping('std', 'student')
    this.addTypoMapping('techer', 'teacher')
    this.addTypoMapping('schedual', 'schedule')
    this.addTypoMapping('attendence', 'attendance')
    this.addTypoMapping('grad', 'grade')
    this.addTypoMapping('gpa', 'เกรด')
    this.addTypoMapping('clas', 'class')
  }

  /**
   * Get all synonym groups
   */
  getSynonymGroups(): Map<string, string[]> {
    return new Map(this.synonymGroups)
  }

  /**
   * Get all typo mappings
   */
  getTypoMappings(): Map<string, string> {
    return new Map(this.typoMappings)
  }
}

/**
 * Global normalizer instance
 */
let globalNormalizer: QueryNormalizer | null = null

/**
 * Get or create the global normalizer
 */
export function getQueryNormalizer(): QueryNormalizer {
  if (!globalNormalizer) {
    globalNormalizer = new QueryNormalizer()
  }
  return globalNormalizer
}

/**
 * Convenience function to normalize a query
 */
export function normalizeQuery(query: string): NormalizedQuery {
  return getQueryNormalizer().normalize(query)
}
