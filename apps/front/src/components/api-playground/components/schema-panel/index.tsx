'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { BookOpen, ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
import { useSchemaDocumentation } from '../../contexts/schema-documentation-context'
import { FieldBrowser } from './field-browser'
import { FieldDetailView } from './field-detail-view'

interface SchemaPanelProps {
  className?: string
}

/**
 * Schema documentation panel
 * Shows field documentation and allows browsing API schema
 */
export const SchemaPanel = ({ className }: SchemaPanelProps) => {
  const {
    selectedField,
    setSelectedField,
    searchQuery,
    setSearchQuery,
    isPanelCollapsed,
    togglePanelCollapsed,
  } = useSchemaDocumentation()

  if (isPanelCollapsed) {
    return (
      <div className={cn('flex flex-col items-center py-4', className)}>
        <Button
          variant="ghost"
          size="icon"
          onClick={togglePanelCollapsed}
          className="mb-2"
          title="Expand schema panel"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="writing-mode-vertical text-xs text-muted-foreground rotate-180">
          API Schema
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col h-full border-l bg-muted/30', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">API Schema</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={togglePanelCollapsed}
          className="h-7 w-7"
          title="Collapse schema panel"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search fields..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 pr-8 text-sm"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 flex flex-col">
        {selectedField ? (
          <>
            {/* Back button when field is selected */}
            <div className="px-3 py-2 border-b">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedField(null)}
                className="h-7 text-xs gap-1"
              >
                <ChevronLeft className="h-3 w-3" />
                Back to fields
              </Button>
            </div>

            {/* Field detail view */}
            <ScrollArea className="flex-1">
              <FieldDetailView fieldPath={selectedField} />
            </ScrollArea>
          </>
        ) : (
          <>
            {/* Field browser */}
            <ScrollArea className="flex-1">
              <FieldBrowser />
            </ScrollArea>

            {/* Footer with hint */}
            <div className="px-3 py-2 border-t bg-muted/50">
              <p className="text-xs text-muted-foreground">
                Click a field to see its documentation
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
