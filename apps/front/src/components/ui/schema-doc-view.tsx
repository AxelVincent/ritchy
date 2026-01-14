'use client'

import { cn } from '@/lib/utils'
import {
  Braces,
  ChevronDown,
  ChevronRight,
  Hash,
  List,
  ToggleLeft,
  Type,
} from 'lucide-react'
import { useState } from 'react'
import { Badge } from './badge'

// biome-ignore lint/suspicious/noExplicitAny: JSON Schema types
type JSONSchema = any

interface SchemaDocViewProps {
  schema: JSONSchema
  className?: string
}

interface SchemaFieldProps {
  name: string
  schema: JSONSchema
  required?: boolean
  depth?: number
  isArrayItem?: boolean
}

// Type colors for visual distinction
const typeColors: Record<string, string> = {
  string: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  number: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  integer: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  boolean: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
  array: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  object: 'bg-slate-500/10 text-slate-600 border-slate-500/30',
  null: 'bg-gray-500/10 text-gray-500 border-gray-500/30',
}

// Type icons
const TypeIcon = ({ type }: { type: string }) => {
  const iconClass = 'h-3 w-3'
  switch (type) {
    case 'string':
      return <Type className={iconClass} />
    case 'number':
    case 'integer':
      return <Hash className={iconClass} />
    case 'boolean':
      return <ToggleLeft className={iconClass} />
    case 'array':
      return <List className={iconClass} />
    case 'object':
      return <Braces className={iconClass} />
    default:
      return null
  }
}

// Get the primary type from a schema (handles anyOf, oneOf, type arrays)
const getSchemaType = (schema: JSONSchema): string => {
  if (!schema) return 'unknown'

  if (schema.type) {
    if (Array.isArray(schema.type)) {
      // Filter out 'null' for display, show primary type
      const nonNull = schema.type.filter((t: string) => t !== 'null')
      return nonNull[0] || 'null'
    }
    return schema.type
  }

  if (schema.anyOf || schema.oneOf) {
    const types = (schema.anyOf || schema.oneOf)
      .map((s: JSONSchema) => s.type)
      .filter((t: string) => t && t !== 'null')
    return types[0] || 'union'
  }

  if (schema.properties) return 'object'
  if (schema.items) return 'array'

  return 'unknown'
}

// Check if a field is nullable
const isNullable = (schema: JSONSchema): boolean => {
  if (!schema) return false
  if (Array.isArray(schema.type)) {
    return schema.type.includes('null')
  }
  if (schema.anyOf || schema.oneOf) {
    return (schema.anyOf || schema.oneOf).some(
      (s: JSONSchema) => s.type === 'null',
    )
  }
  return false
}

// Get the inner schema for nullable types
const getInnerSchema = (schema: JSONSchema): JSONSchema => {
  if (schema.anyOf || schema.oneOf) {
    const types = schema.anyOf || schema.oneOf
    const nonNull = types.find((s: JSONSchema) => s.type !== 'null')
    return nonNull || schema
  }
  return schema
}

// Format type label
const formatTypeLabel = (schema: JSONSchema): string => {
  const type = getSchemaType(schema)
  const inner = getInnerSchema(schema)

  if (type === 'array' && inner.items) {
    const itemType = getSchemaType(inner.items)
    return `${itemType}[]`
  }

  if (schema.enum) {
    return schema.enum.map((v: string) => `"${v}"`).join(' | ')
  }

  return type
}

/**
 * Single field in the schema documentation
 */
const SchemaField = ({
  name,
  schema,
  required = false,
  depth = 0,
  isArrayItem = false,
}: SchemaFieldProps) => {
  const [isExpanded, setIsExpanded] = useState(depth < 2)

  const type = getSchemaType(schema)
  const innerSchema = getInnerSchema(schema)
  const nullable = isNullable(schema)
  const typeLabel = formatTypeLabel(schema)
  const description = schema.description || innerSchema.description

  // Check if this field has nested content
  const hasProperties =
    innerSchema.properties && Object.keys(innerSchema.properties).length > 0
  const hasItems =
    innerSchema.items &&
    (innerSchema.items.properties || innerSchema.items.items)
  const isExpandable = hasProperties || hasItems

  // Get nested content
  const nestedProperties = innerSchema.properties
  const nestedRequired = innerSchema.required || []
  const arrayItemSchema = innerSchema.items

  return (
    <div className={cn('border-l-2 border-muted', depth > 0 && 'ml-4')}>
      {/* Field header */}
      <div
        className={cn(
          'group flex items-start gap-2 py-2 px-3 hover:bg-muted/50 transition-colors',
          isExpandable && 'cursor-pointer',
        )}
        onClick={() => isExpandable && setIsExpanded(!isExpanded)}
        onKeyDown={(e) => {
          if (isExpandable && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            setIsExpanded(!isExpanded)
          }
        }}
        tabIndex={isExpandable ? 0 : undefined}
        role={isExpandable ? 'button' : undefined}
        aria-expanded={isExpandable ? isExpanded : undefined}
      >
        {/* Expand/collapse indicator */}
        <div className="w-4 h-5 flex items-center justify-center shrink-0">
          {isExpandable ? (
            isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )
          ) : (
            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
          )}
        </div>

        {/* Field info */}
        <div className="flex-1 min-w-0">
          {/* Name and type row */}
          <div className="flex items-center gap-2 flex-wrap">
            <code className="text-sm font-semibold text-foreground">
              {isArrayItem ? '[items]' : name}
            </code>

            {/* Type badge */}
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] px-1.5 py-0 h-5 font-mono gap-1',
                typeColors[type] || typeColors.object,
              )}
            >
              <TypeIcon type={type} />
              {typeLabel}
            </Badge>

            {/* Nullable indicator */}
            {nullable && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-5 bg-gray-500/10 text-gray-500 border-gray-500/30"
              >
                nullable
              </Badge>
            )}

            {/* Required indicator */}
            {required && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-5 bg-red-500/10 text-red-500 border-red-500/30"
              >
                required
              </Badge>
            )}
          </div>

          {/* Description */}
          {description && (
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {description}
            </p>
          )}

          {/* Constraints */}
          {(schema.minimum !== undefined ||
            schema.maximum !== undefined ||
            schema.minLength !== undefined ||
            schema.maxLength !== undefined ||
            schema.pattern ||
            schema.format) && (
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {schema.format && (
                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  format: {schema.format}
                </span>
              )}
              {schema.minimum !== undefined && (
                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  min: {schema.minimum}
                </span>
              )}
              {schema.maximum !== undefined && (
                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  max: {schema.maximum}
                </span>
              )}
              {schema.minLength !== undefined && (
                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  minLength: {schema.minLength}
                </span>
              )}
              {schema.maxLength !== undefined && (
                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  maxLength: {schema.maxLength}
                </span>
              )}
              {schema.pattern && (
                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
                  pattern: {schema.pattern}
                </span>
              )}
            </div>
          )}

          {/* Enum values */}
          {schema.enum && schema.enum.length <= 6 && (
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span className="text-[10px] text-muted-foreground">values:</span>
              {schema.enum.map((value: string) => (
                <code
                  key={value}
                  className="text-[10px] bg-muted px-1.5 py-0.5 rounded"
                >
                  {JSON.stringify(value)}
                </code>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Nested properties */}
      {isExpanded && hasProperties && (
        <div className="border-t border-muted/50">
          {Object.entries(nestedProperties).map(([propName, propSchema]) => (
            <SchemaField
              key={propName}
              name={propName}
              schema={propSchema as JSONSchema}
              required={nestedRequired.includes(propName)}
              depth={depth + 1}
            />
          ))}
        </div>
      )}

      {/* Array items */}
      {isExpanded && hasItems && arrayItemSchema && (
        <div className="border-t border-muted/50">
          <SchemaField
            name="items"
            schema={arrayItemSchema}
            depth={depth + 1}
            isArrayItem
          />
        </div>
      )}
    </div>
  )
}

/**
 * Documentation-style schema view
 * Displays JSON Schema as collapsible documentation with type badges
 */
export const SchemaDocView = ({ schema, className }: SchemaDocViewProps) => {
  if (!schema || !schema.properties) {
    return (
      <div className={cn('p-4 text-center text-muted-foreground', className)}>
        No schema properties to display
      </div>
    )
  }

  const properties = schema.properties
  const required = schema.required || []

  return (
    <div className={cn('divide-y divide-muted', className)}>
      {Object.entries(properties).map(([name, propSchema]) => (
        <SchemaField
          key={name}
          name={name}
          schema={propSchema as JSONSchema}
          required={required.includes(name)}
          depth={0}
        />
      ))}
    </div>
  )
}
