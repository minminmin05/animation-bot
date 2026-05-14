/**
 * Teacher ID Extractor
 *
 * Extracts teacher IDs from queries.
 */

import {
  EntityExtractor,
  EntityType,
  ExtractionResult
} from '../entity.types.js'
import { TEACHER_ID_PATTERNS } from '../patterns.js'

/**
 * Teacher ID extractor
 */
export class TeacherIdExtractor implements EntityExtractor {
  readonly type: EntityType = 'teacherIds'

  private patterns = TEACHER_ID_PATTERNS

  extract(query: string): ExtractionResult {
    const matches: string[] = []
    let totalConfidence = 0
    const seen = new Set<string>()

    for (const { pattern, confidence } of this.patterns) {
      const found = query.match(pattern)

      if (found) {
        for (const match of found) {
          const cleaned = match.trim().toUpperCase()

          if (!cleaned || seen.has(cleaned)) {
            continue
          }

          seen.add(cleaned)
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
