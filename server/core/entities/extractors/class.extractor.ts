/**
 * Class/Room Extractor
 *
 * Extracts class names and room numbers from queries.
 */

import {
  EntityExtractor,
  EntityType,
  ExtractionResult
} from '../entity.types.js'
import { ROOM_PATTERNS } from '../patterns.js'

/**
 * Class/Room extractor
 */
export class ClassExtractor implements EntityExtractor {
  readonly type: EntityType = 'classes'

  private patterns = ROOM_PATTERNS

  extract(query: string): ExtractionResult {
    const matches: string[] = []
    let totalConfidence = 0
    const seen = new Set<string>()

    const words = query.split(/\s+/)

    for (const { pattern, confidence, validator } of this.patterns) {
      const found = query.match(pattern)

      if (found) {
        for (const match of found) {
          const cleaned = match.trim()

          if (!cleaned || seen.has(cleaned)) {
            continue
          }

          // Run validator if provided
          if (validator && !validator(cleaned, words)) {
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
