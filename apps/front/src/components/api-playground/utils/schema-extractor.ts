import type { z } from 'zod'
import type {
  DataSource,
  FieldConstraints,
  FieldMetadata,
  FieldType,
} from '../types/field-metadata'

/**
 * Extract field metadata from a Zod schema
 * This creates a tree structure of field information for documentation
 */
export const extractSchemaMetadata = (
  schema: z.ZodType,
  basePath = '',
  source: DataSource = 'root',
): FieldMetadata[] => {
  const fields: FieldMetadata[] = []
  extractFieldsRecursive(schema, basePath, source, fields)
  return fields
}

/**
 * Recursively extract fields from a Zod schema
 */
const extractFieldsRecursive = (
  schema: z.ZodType,
  currentPath: string,
  source: DataSource,
  fields: FieldMetadata[],
  _parentName = '',
): void => {
  // biome-ignore lint/suspicious/noExplicitAny: Zod internal types
  const typeDef = schema._def as any

  // Handle ZodObject
  if (typeDef.typeName === 'ZodObject') {
    const shape = typeDef.shape() as Record<string, z.ZodType>
    for (const [key, value] of Object.entries(shape)) {
      const fieldPath = currentPath ? `${currentPath}.${key}` : key
      const fieldSource = inferDataSource(fieldPath, source)
      const fieldSchema = value as z.ZodType

      const metadata = createFieldMetadata(
        fieldSchema,
        fieldPath,
        key,
        fieldSource,
      )
      fields.push(metadata)

      // Recurse into nested objects
      if (metadata.type === 'object' && metadata.children === undefined) {
        const children: FieldMetadata[] = []
        const unwrapped = unwrapSchema(fieldSchema)
        // biome-ignore lint/suspicious/noExplicitAny: Zod internal types
        if ((unwrapped._def as any).typeName === 'ZodObject') {
          extractFieldsRecursive(
            unwrapped,
            fieldPath,
            fieldSource,
            children,
            key,
          )
          if (children.length > 0) {
            metadata.children = children
          }
        }
      }

      // Recurse into arrays of objects
      if (metadata.isArray) {
        const unwrapped = unwrapSchema(fieldSchema)
        // biome-ignore lint/suspicious/noExplicitAny: Zod internal types
        const unwrappedDef = unwrapped._def as any
        if (unwrappedDef.typeName === 'ZodArray') {
          const elementSchema = unwrappedDef.type
          const elementUnwrapped = unwrapSchema(elementSchema)
          // biome-ignore lint/suspicious/noExplicitAny: Zod internal types
          if ((elementUnwrapped._def as any).typeName === 'ZodObject') {
            const children: FieldMetadata[] = []
            extractFieldsRecursive(
              elementUnwrapped,
              `${fieldPath}[]`,
              fieldSource,
              children,
              key,
            )
            if (children.length > 0) {
              metadata.children = children
            }
          }
        }
      }
    }
  }
}

/**
 * Create a FieldMetadata object from a Zod schema
 */
const createFieldMetadata = (
  schema: z.ZodType,
  path: string,
  name: string,
  source: DataSource,
): FieldMetadata => {
  const { type, typeLabel, isNullable, isOptional, isArray, constraints } =
    analyzeZodType(schema)

  const description = extractDescription(schema)

  return {
    path,
    name,
    type,
    typeLabel,
    isNullable,
    isOptional,
    isArray,
    source,
    description,
    constraints,
  }
}

/**
 * Analyze a Zod type and extract type information
 */
const analyzeZodType = (
  schema: z.ZodType,
): {
  type: FieldType
  typeLabel: string
  isNullable: boolean
  isOptional: boolean
  isArray: boolean
  constraints?: FieldConstraints
} => {
  let current = schema
  let isNullable = false
  let isOptional = false
  let isArray = false
  let constraints: FieldConstraints | undefined

  // Unwrap nullable/optional/default wrappers
  // biome-ignore lint/suspicious/noExplicitAny: Zod internal types
  let def = current._def as any

  while (true) {
    const typeName = def.typeName

    if (typeName === 'ZodNullable') {
      isNullable = true
      current = def.innerType
      def = current._def
    } else if (typeName === 'ZodOptional') {
      isOptional = true
      current = def.innerType
      def = current._def
    } else if (typeName === 'ZodDefault') {
      current = def.innerType
      def = current._def
    } else {
      break
    }
  }

  const typeName = def.typeName
  let type: FieldType = 'string'
  let typeLabel = 'unknown'

  switch (typeName) {
    case 'ZodString':
      type = 'string'
      typeLabel = isNullable ? 'string | null' : 'string'
      constraints = extractStringConstraints(def)
      break

    case 'ZodNumber':
      type = 'number'
      typeLabel = isNullable ? 'number | null' : 'number'
      constraints = extractNumberConstraints(def)
      break

    case 'ZodBoolean':
      type = 'boolean'
      typeLabel = isNullable ? 'boolean | null' : 'boolean'
      break

    case 'ZodArray': {
      type = 'array'
      isArray = true
      const elementType = getElementTypeName(def.type)
      typeLabel = `${elementType}[]`
      if (isNullable) typeLabel += ' | null'
      break
    }

    case 'ZodObject':
      type = 'object'
      typeLabel = isNullable ? 'object | null' : 'object'
      break

    case 'ZodEnum': {
      type = 'enum'
      const values = def.values as string[]
      typeLabel = values.map((v) => `"${v}"`).join(' | ')
      constraints = { enum: values }
      break
    }

    case 'ZodUnion':
      type = 'union'
      typeLabel = 'union'
      break

    case 'ZodLiteral':
      type = typeof def.value as FieldType
      typeLabel = JSON.stringify(def.value)
      break

    case 'ZodNull':
      type = 'null'
      typeLabel = 'null'
      isNullable = true
      break

    default:
      type = 'string'
      typeLabel = typeName.replace('Zod', '').toLowerCase()
  }

  if (isOptional && !typeLabel.includes('undefined')) {
    typeLabel += ' | undefined'
  }

  return { type, typeLabel, isNullable, isOptional, isArray, constraints }
}

/**
 * Extract description from Zod schema
 */
const extractDescription = (schema: z.ZodType): string | undefined => {
  // biome-ignore lint/suspicious/noExplicitAny: Zod internal types
  const def = schema._def as any
  return def.description
}

/**
 * Extract string constraints from Zod string schema
 */
// biome-ignore lint/suspicious/noExplicitAny: Zod internal types
const extractStringConstraints = (def: any): FieldConstraints | undefined => {
  const constraints: FieldConstraints = {}
  let hasConstraints = false

  if (def.checks) {
    // biome-ignore lint/suspicious/noExplicitAny: Zod internal types
    for (const check of def.checks as any[]) {
      if (check.kind === 'min') {
        constraints.min = check.value
        hasConstraints = true
      } else if (check.kind === 'max') {
        constraints.max = check.value
        hasConstraints = true
      } else if (check.kind === 'regex') {
        constraints.pattern = check.regex.source
        hasConstraints = true
      } else if (check.kind === 'url') {
        constraints.format = 'url'
        hasConstraints = true
      } else if (check.kind === 'email') {
        constraints.format = 'email'
        hasConstraints = true
      }
    }
  }

  return hasConstraints ? constraints : undefined
}

/**
 * Extract number constraints from Zod number schema
 */
// biome-ignore lint/suspicious/noExplicitAny: Zod internal types
const extractNumberConstraints = (def: any): FieldConstraints | undefined => {
  const constraints: FieldConstraints = {}
  let hasConstraints = false

  if (def.checks) {
    // biome-ignore lint/suspicious/noExplicitAny: Zod internal types
    for (const check of def.checks as any[]) {
      if (check.kind === 'min') {
        constraints.min = check.value
        hasConstraints = true
      } else if (check.kind === 'max') {
        constraints.max = check.value
        hasConstraints = true
      }
    }
  }

  return hasConstraints ? constraints : undefined
}

/**
 * Get element type name for array types
 */
const getElementTypeName = (elementSchema: z.ZodType): string => {
  const unwrapped = unwrapSchema(elementSchema)
  // biome-ignore lint/suspicious/noExplicitAny: Zod internal types
  const typeName = (unwrapped._def as any).typeName

  switch (typeName) {
    case 'ZodString':
      return 'string'
    case 'ZodNumber':
      return 'number'
    case 'ZodBoolean':
      return 'boolean'
    case 'ZodObject':
      return 'object'
    default:
      return typeName.replace('Zod', '').toLowerCase()
  }
}

/**
 * Unwrap nullable/optional/default wrappers to get the core schema
 */
const unwrapSchema = (schema: z.ZodType): z.ZodType => {
  let current = schema
  // biome-ignore lint/suspicious/noExplicitAny: Zod internal types
  let def = current._def as any

  while (true) {
    const typeName = def.typeName

    if (
      typeName === 'ZodNullable' ||
      typeName === 'ZodOptional' ||
      typeName === 'ZodDefault'
    ) {
      current = def.innerType
      def = current._def
    } else {
      break
    }
  }

  return current
}

/**
 * Infer data source from field path
 */
const inferDataSource = (
  path: string,
  parentSource: DataSource,
): DataSource => {
  if (path.startsWith('data.website') || path.startsWith('website')) {
    return 'website'
  }
  if (path.startsWith('data.registry') || path.startsWith('registry')) {
    return 'registry'
  }
  if (
    path.startsWith('data.googlePlace') ||
    path.startsWith('googlePlace') ||
    path.startsWith('data.google')
  ) {
    return 'google'
  }
  if (path.startsWith('meta')) {
    return 'meta'
  }
  return parentSource
}

/**
 * Get value from an object by path (e.g., "data.website.emails")
 */
export const getValueByPath = (obj: unknown, path: string): unknown => {
  if (!obj || typeof obj !== 'object') return undefined

  const parts = path.split('.')
  let current: unknown = obj

  for (const part of parts) {
    if (current === null || current === undefined) return undefined

    // Handle array notation like "emails[]"
    const arrayMatch = part.match(/^(.+)\[\]$/)
    if (arrayMatch) {
      const key = arrayMatch[1]
      current = (current as Record<string, unknown>)[key]
      if (Array.isArray(current) && current.length > 0) {
        current = current[0] // Return first element as example
      }
    } else {
      current = (current as Record<string, unknown>)[part]
    }
  }

  return current
}

/**
 * Flatten nested field metadata into a flat list for searching
 */
export const flattenFields = (fields: FieldMetadata[]): FieldMetadata[] => {
  const result: FieldMetadata[] = []

  const flatten = (fieldList: FieldMetadata[]) => {
    for (const field of fieldList) {
      result.push(field)
      if (field.children) {
        flatten(field.children)
      }
    }
  }

  flatten(fields)
  return result
}

/**
 * Search fields by query (matches path, name, or description)
 */
export const searchFields = (
  fields: FieldMetadata[],
  query: string,
): FieldMetadata[] => {
  if (!query.trim()) return fields

  const lowerQuery = query.toLowerCase()
  const flattened = flattenFields(fields)

  return flattened.filter((field) => {
    return (
      field.path.toLowerCase().includes(lowerQuery) ||
      field.name.toLowerCase().includes(lowerQuery) ||
      field.description?.toLowerCase().includes(lowerQuery)
    )
  })
}
