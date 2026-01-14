/**
 * Field metadata types for API schema documentation
 * Used to display field information in the schema documentation panel
 */

export type FieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'array'
  | 'object'
  | 'null'
  | 'enum'
  | 'union'

export type DataSource = 'google' | 'website' | 'registry' | 'meta' | 'root'

export interface FieldMetadata {
  /** Full path to the field (e.g., "data.website.emails") */
  path: string

  /** Field name (e.g., "emails") */
  name: string

  /** Field type */
  type: FieldType

  /** Human-readable type string (e.g., "string | null", "Email[]") */
  typeLabel: string

  /** Whether the field can be null */
  isNullable: boolean

  /** Whether the field is optional in the schema */
  isOptional: boolean

  /** Whether the field is an array */
  isArray: boolean

  /** Description from Zod .describe() or manually added */
  description?: string

  /** Nested fields for objects and arrays */
  children?: FieldMetadata[]

  /** Which data source this field belongs to */
  source: DataSource

  /** Validation constraints if any */
  constraints?: FieldConstraints

  /** Example value for documentation */
  example?: unknown
}

export interface FieldConstraints {
  /** Minimum value/length */
  min?: number
  /** Maximum value/length */
  max?: number
  /** Regex pattern for strings */
  pattern?: string
  /** Allowed enum values */
  enum?: string[]
  /** URL format */
  format?: 'url' | 'email' | 'date' | 'datetime'
}

/**
 * Schema documentation state managed by context
 */
export interface SchemaDocumentationState {
  /** All field metadata extracted from schema */
  fields: FieldMetadata[]

  /** Currently selected field path for detail view */
  selectedField: string | null

  /** Currently hovered field path for highlighting */
  hoveredField: string | null

  /** Search query for filtering fields */
  searchQuery: string

  /** Whether the schema panel is collapsed */
  isPanelCollapsed: boolean
}

/**
 * Schema documentation context value
 */
export interface SchemaDocumentationContextValue
  extends SchemaDocumentationState {
  /** Set the selected field */
  setSelectedField: (path: string | null) => void

  /** Set the hovered field */
  setHoveredField: (path: string | null) => void

  /** Set the search query */
  setSearchQuery: (query: string) => void

  /** Toggle panel collapse state */
  togglePanelCollapsed: () => void

  /** Get metadata for a specific field path */
  getFieldMetadata: (path: string) => FieldMetadata | undefined

  /** Get example value from response data for a field path */
  getFieldExample: (path: string) => unknown

  /** Get all fields matching a search query */
  searchFields: (query: string) => FieldMetadata[]

  /** Get fields by data source */
  getFieldsBySource: (source: DataSource) => FieldMetadata[]
}

/**
 * Type guard to check if a value is a FieldMetadata
 */
export const isFieldMetadata = (value: unknown): value is FieldMetadata => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'path' in value &&
    'name' in value &&
    'type' in value
  )
}
