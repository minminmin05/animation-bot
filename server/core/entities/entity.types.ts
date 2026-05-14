/**
 * Entity Types
 *
 * Defines the structure for extracted entities from user queries
 */

/**
 * Entity types that can be extracted
 */
export type EntityType =
  | 'people'
  | 'studentIds'
  | 'teacherIds'
  | 'classes'
  | 'subjects'
  | 'dates'
  | 'semesters'
  | 'rooms'

/**
 * Extracted entities from a query
 */
export interface ExtractedEntities {
  /** Person names (Thai and English) */
  people: string[]

  /** Student IDs */
  studentIds: string[]

  /** Teacher IDs */
  teacherIds: string[]

  /** Class names/numbers */
  classes: string[]

  /** Subject names */
  subjects: string[]

  /** Dates mentioned */
  dates: string[]

  /** Semesters mentioned */
  semesters: string[]

  /** Room numbers */
  rooms: string[]
}

/**
 * Empty entities object
 */
export const EMPTY_ENTITIES: ExtractedEntities = {
  people: [],
  studentIds: [],
  teacherIds: [],
  classes: [],
  subjects: [],
  dates: [],
  semesters: [],
  rooms: []
}

/**
 * Extraction result from a single extractor
 */
export interface ExtractionResult {
  values: string[]
  confidence: number
}

/**
 * Full entity extraction result
 */
export interface EntityExtractionResult {
  entities: ExtractedEntities
  confidence: Record<EntityType, number>
}

/**
 * Entity extractor interface
 */
export interface EntityExtractor {
  /** The entity type this extractor handles */
  readonly type: EntityType

  /**
   * Extract entities from the query
   */
  extract(query: string): ExtractionResult
}

/**
 * Entity pattern definition
 */
export interface EntityPattern {
  /** Regex pattern */
  pattern: RegExp

  /** Confidence score for this pattern */
  confidence: number

  /** Optional validation function */
  validator?: (match: string) => boolean
}

/**
 * Entity extraction options
 */
export interface EntityExtractionOptions {
  /** Whether to include low-confidence extractions */
  includeLowConfidence?: boolean

  /** Minimum confidence threshold */
  minConfidence?: number

  /** Whether to deduplicate results */
  deduplicate?: boolean
}

/**
 * Normalized query result
 */
export interface NormalizedQuery {
  /** Original query text */
  original: string

  /** Normalized query text */
  normalized: string

  /** Detected synonyms that were replaced */
  detectedSynonyms: string[]

  /** Detected language */
  language?: 'th' | 'en' | 'mixed'
}
