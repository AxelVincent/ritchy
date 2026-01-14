'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { useSchemaDocumentation } from '../../contexts/schema-documentation-context'
import type { FieldMetadata } from '../../types/field-metadata'
import {
  DATA_SOURCE_DESCRIPTIONS,
  DATA_SOURCE_LABELS,
} from '../../utils/schema-metadata'
import { SourceIcon } from './field-browser'

interface FieldDetailViewProps {
  fieldPath: string
}

/**
 * Detailed view of a single field
 * Shows type, description, constraints, and example value
 */
export const FieldDetailView = ({ fieldPath }: FieldDetailViewProps) => {
  const { getFieldMetadata, getFieldExample } = useSchemaDocumentation()
  const field = getFieldMetadata(fieldPath)

  if (!field) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Field not found
      </div>
    )
  }

  const example = getFieldExample(fieldPath)

  return (
    <div className="p-4 space-y-4">
      {/* Field Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <SourceIcon source={field.source} className="h-4 w-4" />
          <h4 className="font-semibold">{field.name}</h4>
        </div>
        <FieldPathCopy path={field.path} />
      </div>

      <Separator />

      {/* Type Information */}
      <div className="space-y-3">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Type</p>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="font-mono">
              {field.typeLabel}
            </Badge>
            {field.isNullable && (
              <Badge variant="outline" className="text-amber-600">
                nullable
              </Badge>
            )}
            {field.isOptional && (
              <Badge variant="outline" className="text-blue-600">
                optional
              </Badge>
            )}
            {field.isArray && (
              <Badge variant="outline" className="text-purple-600">
                array
              </Badge>
            )}
          </div>
        </div>

        {/* Description */}
        {field.description && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Description</p>
            <p className="text-sm">{field.description}</p>
          </div>
        )}

        {/* Data Source */}
        <div>
          <p className="text-xs text-muted-foreground mb-1">Data Source</p>
          <div className="flex items-center gap-2">
            <SourceIcon source={field.source} className="h-4 w-4" />
            <span className="text-sm">{DATA_SOURCE_LABELS[field.source]}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {DATA_SOURCE_DESCRIPTIONS[field.source]}
          </p>
        </div>

        {/* Constraints */}
        {field.constraints && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Constraints</p>
            <ConstraintsList constraints={field.constraints} />
          </div>
        )}
      </div>

      <Separator />

      {/* Example Value */}
      <div>
        <p className="text-xs text-muted-foreground mb-1">
          Example from Response
        </p>
        {example !== undefined ? (
          <Card className="bg-muted/50">
            <CardContent className="p-3">
              <pre className="text-xs font-mono overflow-auto max-h-40">
                {formatExample(example)}
              </pre>
            </CardContent>
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            No data in current response
          </p>
        )}
      </div>

      {/* Children preview */}
      {field.children && field.children.length > 0 && (
        <>
          <Separator />
          <div>
            <p className="text-xs text-muted-foreground mb-2">
              Nested Fields ({field.children.length})
            </p>
            <div className="space-y-1">
              {field.children.slice(0, 5).map((child) => (
                <div
                  key={child.path}
                  className="flex items-center gap-2 text-xs"
                >
                  <span className="font-mono text-muted-foreground">
                    {child.name}
                  </span>
                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                    {child.type}
                  </Badge>
                </div>
              ))}
              {field.children.length > 5 && (
                <p className="text-xs text-muted-foreground">
                  ...and {field.children.length - 5} more
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Copyable field path
 */
const FieldPathCopy = ({ path }: { path: string }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(path)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  return (
    <div className="flex items-center gap-1 group">
      <code className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
        {path}
      </code>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleCopy}
        title="Copy field path"
      >
        {copied ? (
          <Check className="h-3 w-3 text-green-500" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </Button>
    </div>
  )
}

/**
 * Display constraints
 */
const ConstraintsList = ({
  constraints,
}: {
  constraints: FieldMetadata['constraints']
}) => {
  if (!constraints) return null

  const items: string[] = []

  if (constraints.min !== undefined) {
    items.push(`Min: ${constraints.min}`)
  }
  if (constraints.max !== undefined) {
    items.push(`Max: ${constraints.max}`)
  }
  if (constraints.format) {
    items.push(`Format: ${constraints.format}`)
  }
  if (constraints.pattern) {
    items.push(`Pattern: ${constraints.pattern}`)
  }
  if (constraints.enum && constraints.enum.length > 0) {
    items.push(`Values: ${constraints.enum.join(', ')}`)
  }

  if (items.length === 0) return null

  return (
    <ul className="text-sm space-y-1">
      {items.map((item) => (
        <li key={item} className="text-muted-foreground">
          {item}
        </li>
      ))}
    </ul>
  )
}

/**
 * Format example value for display
 */
const formatExample = (value: unknown): string => {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'

  if (typeof value === 'object') {
    // Truncate large objects
    const str = JSON.stringify(value, null, 2)
    if (str.length > 500) {
      return `${str.substring(0, 500)}\n... (truncated)`
    }
    return str
  }

  return String(value)
}
