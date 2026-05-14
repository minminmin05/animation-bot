/**
 * Person Name Extractor
 *
 * Extracts Thai and English person names from queries.
 * Consolidated from intent.service.ts and grade.service.ts
 */

import {
  EntityExtractor,
  EntityType,
  ExtractionResult
} from '../entity.types.js'
import { PERSON_NAME_PATTERNS, EXCLUDED_WORDS } from '../patterns.js'

/**
 * Person name extractor
 */
export class PersonExtractor implements EntityExtractor {
  readonly type: EntityType = 'people'

  private patterns = PERSON_NAME_PATTERNS

  /**
   * Extract person names from the query
   */
  extract(query: string): ExtractionResult {
    const matches: string[] = []
    let totalConfidence = 0
    const seen = new Set<string>()

    // Split query into words for context checking
    const words = query.split(/\s+/)

    for (const { pattern, confidence, validator } of this.patterns) {
      const found = query.match(pattern)

      if (found) {
        for (const match of found) {
          // Clean up the match
          const cleaned = match.trim()

          // Skip if empty, too short, or already seen
          if (!cleaned || cleaned.length < 2 || seen.has(cleaned)) {
            continue
          }

          // Skip if it's an excluded word
          if (EXCLUDED_WORDS.has(cleaned.toLowerCase())) {
            continue
          }

          // Run validator if provided
          if (validator && !validator(cleaned, words)) {
            continue
          }

          // Additional validation for person names
          if (this.looksLikeName(cleaned, words)) {
            seen.add(cleaned)
            matches.push(cleaned)
            totalConfidence += confidence
          }
        }
      }
    }

    return {
      values: matches,
      confidence: matches.length > 0 ? totalConfidence / matches.length : 0
    }
  }

  /**
   * Check if a string looks like a person name
   */
  private looksLikeName(text: string, context: string[]): boolean {
    // Skip if it's purely numeric
    if (/^\d+$/.test(text)) {
      return false
    }

    // Skip if it's a single character
    if (text.length < 2) {
      return false
    }

    // Skip if it's all lowercase (likely not a name)
    if (/^[a-z]+$/.test(text) && context.length < 5) {
      return false
    }

    // Skip common false positives
    const falsePositives = [
      'test', 'data', 'info', 'list', 'all', 'the', 'this', 'that',
      'โรงเรียน', 'ห้องเรียน', 'คาบเรียน', 'ตารางเรียน'
    ]

    if (falsePositives.includes(text.toLowerCase())) {
      return false
    }

    // Thai names should have Thai characters
    if (/[฀-๿]/.test(text)) {
      // Valid Thai name
      return true
    }

    // English names should start with capital letter
    if (/^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/.test(text)) {
      return true
    }

    // Mixed Thai-English
    if (/[฀-๿]/.test(text) && /[a-zA-Z]/.test(text)) {
      return true
    }

    return false
  }
}
