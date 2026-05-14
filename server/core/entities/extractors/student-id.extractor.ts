/**
 * Student ID Extractor
 *
 * Extracts student IDs from queries.
 */

import {
  EntityExtractor,
  EntityType,
  ExtractionResult
} from '../entity.types.js'
import { STUDENT_ID_PATTERNS, ROOM_PATTERNS } from '../patterns.js'

/**
 * Student ID extractor
 */
export class StudentIdExtractor implements EntityExtractor {
  readonly type: EntityType = 'studentIds'

  private patterns = STUDENT_ID_PATTERNS
  private roomPatterns = ROOM_PATTERNS

  extract(query: string): ExtractionResult {
    const matches: string[] = []
    let totalConfidence = 0
    const seen = new Set<string>()

    // First, collect potential room numbers to exclude them
    const roomNumbers = new Set<string>()
    for (const { pattern } of this.roomPatterns) {
      const found = query.match(pattern)
      if (found) {
        for (const match of found) {
          roomNumbers.add(match.replace(/\D/g, '')) // Extract just the numbers
        }
      }
    }

    for (const { pattern, confidence, validator } of this.patterns) {
      const found = query.match(pattern)

      if (found) {
        for (const match of found) {
          const cleaned = match.trim()

          if (!cleaned || seen.has(cleaned)) {
            continue
          }

          // Run validator if provided
          if (validator && !validator(cleaned)) {
            continue
          }

          // Additional check: exclude if it matches a room pattern
          const numericPart = cleaned.replace(/\D/g, '')
          if (roomNumbers.has(numericPart) && cleaned.length <= 4) {
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
