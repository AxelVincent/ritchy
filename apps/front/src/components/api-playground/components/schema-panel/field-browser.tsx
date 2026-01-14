'use client'

import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import {
  Building,
  ChevronDown,
  ChevronRight,
  Database,
  Globe,
  MapPin,
  Settings,
} from 'lucide-react'
import { useState } from 'react'
import { useSchemaDocumentation } from '../../contexts/schema-documentation-context'
import type { DataSource, FieldMetadata } from '../../types/field-metadata'
import { DATA_SOURCE_LABELS } from '../../utils/schema-metadata'

/**
 * Field browser component
 * Displays a searchable tree of API fields grouped by data source
 */
export const FieldBrowser = () => {
  const { fields, searchQuery, setSelectedField, searchFields } =
    useSchemaDocumentation()

  // If searching, show flat list of matching fields
  if (searchQuery.trim()) {
    const results = searchFields(searchQuery)

    if (results.length === 0) {
      return (
        <div className="p-4 text-center text-sm text-muted-foreground">
          No fields matching "{searchQuery}"
        </div>
      )
    }

    return (
      <div className="p-2">
        <p className="text-xs text-muted-foreground px-2 mb-2">
          {results.length} field{results.length !== 1 ? 's' : ''} found
        </p>
        {results.map((field) => (
          <FieldItem
            key={field.path}
            field={field}
            onClick={() => setSelectedField(field.path)}
            showFullPath
          />
        ))}
      </div>
    )
  }

  // Default: show fields grouped by source in collapsible sections
  return (
    <div className="p-2 space-y-1">
      {fields.map((field) => (
        <FieldNode
          key={field.path}
          field={field}
          level={0}
          defaultOpen={field.name === 'data' || field.name === 'meta'}
        />
      ))}
    </div>
  )
}

interface FieldNodeProps {
  field: FieldMetadata
  level: number
  defaultOpen?: boolean
}

/**
 * A single field node in the tree
 * Can be expanded if it has children
 */
const FieldNode = ({ field, level, defaultOpen = false }: FieldNodeProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const { setSelectedField, hoveredField, setHoveredField } =
    useSchemaDocumentation()

  const hasChildren = field.children && field.children.length > 0
  const isHovered = hoveredField === field.path

  if (hasChildren) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full">
          <div
            className={cn(
              'flex items-center gap-1 px-2 py-1.5 rounded-md text-left hover:bg-muted/50 transition-colors',
              isHovered && 'bg-primary/10',
            )}
            style={{ paddingLeft: `${level * 12 + 8}px` }}
            onMouseEnter={() => setHoveredField(field.path)}
            onMouseLeave={() => setHoveredField(null)}
          >
            {isOpen ? (
              <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
            )}
            <SourceIcon
              source={field.source}
              className="h-3.5 w-3.5 shrink-0"
            />
            <span className="text-sm font-medium truncate">{field.name}</span>
            <TypeBadge type={field.typeLabel} isArray={field.isArray} />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {field.children?.map((child) => (
            <FieldNode
              key={child.path}
              field={child}
              level={level + 1}
              defaultOpen={false}
            />
          ))}
        </CollapsibleContent>
      </Collapsible>
    )
  }

  return (
    <FieldItem
      field={field}
      level={level}
      onClick={() => setSelectedField(field.path)}
      isHovered={isHovered}
      onMouseEnter={() => setHoveredField(field.path)}
      onMouseLeave={() => setHoveredField(null)}
    />
  )
}

interface FieldItemProps {
  field: FieldMetadata
  level?: number
  onClick: () => void
  showFullPath?: boolean
  isHovered?: boolean
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

/**
 * A clickable field item
 */
const FieldItem = ({
  field,
  level = 0,
  onClick,
  showFullPath,
  isHovered,
  onMouseEnter,
  onMouseLeave,
}: FieldItemProps) => {
  return (
    <button
      type="button"
      className={cn(
        'w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-left hover:bg-muted/50 transition-colors',
        isHovered && 'bg-primary/10',
      )}
      style={{ paddingLeft: showFullPath ? '8px' : `${level * 12 + 20}px` }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <SourceIcon source={field.source} className="h-3.5 w-3.5 shrink-0" />
      <span className="text-sm truncate">
        {showFullPath ? (
          <span className="font-mono text-xs">{field.path}</span>
        ) : (
          field.name
        )}
      </span>
      <TypeBadge type={field.typeLabel} isArray={field.isArray} />
      {field.isNullable && (
        <span className="text-xs text-muted-foreground">?</span>
      )}
    </button>
  )
}

interface SourceIconProps {
  source: DataSource
  className?: string
}

/**
 * Icon for data source
 */
const SourceIcon = ({ source, className }: SourceIconProps) => {
  switch (source) {
    case 'google':
      return <MapPin className={cn('text-red-500', className)} />
    case 'website':
      return <Globe className={cn('text-blue-500', className)} />
    case 'registry':
      return <Building className={cn('text-amber-500', className)} />
    case 'meta':
      return <Settings className={cn('text-slate-500', className)} />
    default:
      return <Database className={cn('text-muted-foreground', className)} />
  }
}

interface TypeBadgeProps {
  type: string
  isArray?: boolean
}

/**
 * Badge showing field type
 */
const TypeBadge = ({ type, isArray }: TypeBadgeProps) => {
  // Simplify the type label for display
  let displayType = type
  if (type.includes('|')) {
    // For union types, just show the base type
    displayType = type.split('|')[0].trim()
  }
  if (displayType.length > 15) {
    displayType = `${displayType.substring(0, 12)}...`
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        'ml-auto text-[10px] px-1 py-0 h-4 font-mono',
        isArray && 'bg-purple-500/10 text-purple-600 border-purple-500/30',
      )}
    >
      {displayType}
    </Badge>
  )
}

export { SourceIcon, TypeBadge, DATA_SOURCE_LABELS }
