/**
 * Subject Extractor
 *
 * Extracts subject names from queries.
 */

import {
  EntityExtractor,
  EntityType,
  ExtractionResult
} from '../entity.types.js'
import { SUBJECT_PATTERNS } from '../patterns.js'

/**
 * Subject extractor
 */
export class SubjectExtractor implements EntityExtractor {
  readonly type: EntityType = 'subjects'

  private patterns = SUBJECT_PATTERNS

  extract(query: string): ExtractionResult {
    const matches: string[] = []
    let totalConfidence = 0
    const seen = new Set<string>()

    for (const { pattern, confidence, validator } of this.patterns) {
      const found = query.match(new RegExp(pattern.source, pattern.flags))

      if (found) {
        for (const match of found) {
          const cleaned = match.trim()

          if (!cleaned || seen.has(cleaned.toLowerCase())) {
            continue
          }

          // Run validator if provided
          if (validator && !validator(cleaned)) {
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
