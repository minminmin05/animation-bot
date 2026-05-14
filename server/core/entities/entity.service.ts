/**
 * Entity Service
 *
 * Centralized entity extraction service.
 * Consolidates entity extraction logic from intent.service.ts and grade.service.ts
 */

import {
  EntityExtractor,
  EntityType,
  ExtractedEntities,
  ExtractionResult,
  EntityExtractionResult,
  EMPTY_ENTITIES
} from './entity.types.js'
import { EXCLUDED_WORDS } from './patterns.js'
import { PersonExtractor } from './extractors/person.extractor.js'
import { StudentIdExtractor } from './extractors/student-id.extractor.js'
import { TeacherIdExtractor } from './extractors/teacher-id.extractor.js'
import { ClassExtractor } from './extractors/class.extractor.js'
import { SubjectExtractor } from './extractors/subject.extractor.js'
import { DateExtractor } from './extractors/date.extractor.js'

/**
 * Entity extraction options
 */
export interface EntityExtractionOptions {
  includeLowConfidence?: boolean
  minConfidence?: number
  deduplicate?: boolean
}

/**
 * Default extraction options
 */
const DEFAULT_OPTIONS: Required<EntityExtractionOptions> = {
  includeLowConfidence: false,
  minConfidence: 0.5,
  deduplicate: true
}

/**
 * Entity service class
 */
export class EntityService {
  private extractors: Map<EntityType, EntityExtractor>

  constructor() {
    this.extractors = new Map([
      ['people', new PersonExtractor()],
      ['studentIds', new StudentIdExtractor()],
      ['teacherIds', new TeacherIdExtractor()],
      ['classes', new ClassExtractor()],
      ['subjects', new SubjectExtractor()],
      ['dates', new DateExtractor()],
      ['semesters', new DateExtractor()], // Dates extractor also handles semesters
      ['rooms', new ClassExtractor()] // Class extractor also handles rooms
    ])
  }

  /**
   * Extract all entities from a query
   */
  extract(query: string, options?: EntityExtractionOptions): EntityExtractionResult {
    const opts = { ...DEFAULT_OPTIONS, ...options }
    const entities: ExtractedEntities = { ...EMPTY_ENTITIES }
    const confidence: Record<EntityType, number> = {
      people: 0,
      studentIds: 0,
      teacherIds: 0,
      classes: 0,
      subjects: 0,
      dates: 0,
      semesters: 0,
      rooms: 0
    }

    for (const [type, extractor] of this.extractors) {
      const result = extractor.extract(query)

      // Filter by confidence if needed
      let values = result.values
      if (!opts.includeLowConfidence && result.confidence < opts.minConfidence) {
        values = []
      }

      // Deduplicate if needed
      if (opts.deduplicate) {
        values = [...new Set(values)]
      }

      // Filter out excluded words
      values = values.filter(v => !EXCLUDED_WORDS.has(v.toLowerCase()))

      entities[type] = values
      confidence[type] = values.length > 0 ? result.confidence : 0
    }

    return { entities, confidence }
  }

  /**
   * Extract a specific entity type
   */
  extractType(
    query: string,
    type: EntityType,
    options?: EntityExtractionOptions
  ): ExtractionResult {
    const extractor = this.extractors.get(type)

    if (!extractor) {
      return { values: [], confidence: 0 }
    }

    const result = extractor.extract(query)
    const opts = { ...DEFAULT_OPTIONS, ...options }

    // Filter by confidence
    let values = result.values
    if (!opts.includeLowConfidence && result.confidence < opts.minConfidence) {
      values = []
    }

    // Deduplicate
    if (opts.deduplicate) {
      values = [...new Set(values)]
    }

    // Filter excluded words
    values = values.filter(v => !EXCLUDED_WORDS.has(v.toLowerCase()))

    return { values, confidence: result.confidence }
  }

  /**
   * Check if any entities were extracted
   */
  hasEntities(result: EntityExtractionResult): boolean {
    return Object.values(result.entities).some(arr => arr.length > 0)
  }

  /**
   * Get all entity values as a flat array
   */
  getAllValues(result: EntityExtractionResult): string[] {
    return Object.values(result.entities).flat()
  }

  /**
   * Get entity summary (for logging)
   */
  getSummary(result: EntityExtractionResult): Record<string, { count: number; confidence: number }> {
    const summary: Record<string, any> = {}

    for (const [type, values] of Object.entries(result.entities)) {
      if (values.length > 0) {
        summary[type] = {
          count: values.length,
          confidence: result.confidence[type as EntityType],
          values: values.slice(0, 3) // Show first 3 values
        }
      }
    }

    return summary
  }
}

/**
 * Global entity service instance
 */
let globalEntityService: EntityService | null = null

/**
 * Get or create the global entity service
 */
export function getEntityService(): EntityService {
  if (!globalEntityService) {
    globalEntityService = new EntityService()
  }
  return globalEntityService
}

/**
 * Convenience function to extract entities
 */
export function extractEntities(
  query: string,
  options?: EntityExtractionOptions
): EntityExtractionResult {
  return getEntityService().extract(query, options)
}
