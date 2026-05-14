/**
 * Date/Semester Extractor
 *
 * Extracts dates and semesters from queries.
 */

import {
  EntityExtractor,
  EntityType,
  ExtractionResult
} from '../entity.types.js'
import { DATE_PATTERNS, SEMESTER_PATTERNS } from '../patterns.js'

/**
 * Date/Semester extractor
 */
export class DateExtractor implements EntityExtractor {
  readonly type: EntityType = 'dates'

  private datePatterns = DATE_PATTERNS
  private semesterPatterns = SEMESTER_PATTERNS

  extract(query: string): ExtractionResult {
    const matches: string[] = []
    let totalConfidence = 0
    const seen = new Set<string>()

    // Extract dates
    for (const { pattern, confidence } of [...this.datePatterns, ...this.semesterPatterns]) {
      const found = query.match(new RegExp(pattern.source, pattern.flags))

      if (found) {
        for (const match of found) {
          const cleaned = match.trim()

          if (!cleaned || seen.has(cleaned.toLowerCase())) {
            continue
          }

          seen.add(cleaned.toLowerCase())
          matches.push(cleaned)
          totalConfidence += confidence
        }
      }
    }

    return {
      values: matches,
      confidence: matches.length > 0 ? totalConfidence / matches.length : 0
    }
  }
}
