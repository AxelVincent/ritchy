'use client'

import { cn } from '@/lib/utils'
import { BookOpen, Check, Code, Copy, TreePine } from 'lucide-react'
import { useMemo, useState } from 'react'
// TODO: Remove this dependency
// We should use the native Zod v4 method to convert the schema to JSON Schema
import { zodToJsonSchema } from 'zod-to-json-schema'
import { Badge } from './badge'
import { JsonTreeViewer } from './json-tree-viewer'
import { SchemaDocView } from './schema-doc-view'
import { ScrollArea } from './scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs'

interface SchemaViewerProps {
  // Accept any Zod schema (v3 or v4 compatible)
  // biome-ignore lint/suspicious/noExplicitAny: Supports both Zod v3 and v4 schemas
  schema: any
  title?: string
  className?: string
  defaultView?: 'docs' | 'tree'
}

/**
 * SchemaViewer - A simple component to display Zod schemas as JSON Schema
 *
 * Designed for developers to easily copy-paste schema definitions to AI tools
 */
export const SchemaViewer = ({
  schema,
  title = 'API Schema',
  className,
  defaultView = 'docs',
}: SchemaViewerProps) => {
  const [copied, setCopied] = useState(false)

  // Convert Zod schema to JSON Schema (memoized)
  const { jsonSchema, hasError } = useMemo(() => {
    try {
      const result = zodToJsonSchema(schema, {
        target: 'jsonSchema7',
        $refStrategy: 'none',
      })
      return { jsonSchema: result, hasError: false }
    } catch (error) {
      console.error('Failed to convert Zod schema to JSON Schema:', error)
      return {
        jsonSchema: {
          error: 'Failed to convert schema',
          details: error instanceof Error ? error.message : String(error),
        },
        hasError: true,
      }
    }
  }, [schema])

  // Format JSON Schema as string for copy
  const jsonSchemaString = useMemo(() => {
    return JSON.stringify(jsonSchema, null, 2)
  }, [jsonSchema])

  // Handle copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonSchemaString)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  return (
    <div
      className={cn(
        'flex flex-col h-full border-l bg-muted/30 overflow-hidden',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background shrink-0">
        <div className="flex items-center gap-2">
          <Code className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">{title}</h3>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            JSON Schema
          </Badge>
        </div>
        {!hasError && (
          <button
            type="button"
            onClick={handleCopy}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
              copied
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-primary/10 text-primary hover:bg-primary/20',
            )}
          >
            {copied ? (
              <>
                <Check className="h-3 w-3" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                Copy
              </>
            )}
          </button>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue={defaultView} className="flex flex-col flex-1 min-h-0">
        <TabsList className="px-4 shrink-0">
          <TabsTrigger value="docs" className="gap-1.5 text-xs">
            <BookOpen className="h-3 w-3" />
            Docs
          </TabsTrigger>
          <TabsTrigger value="tree" className="gap-1.5 text-xs">
            <TreePine className="h-3 w-3" />
            Raw
          </TabsTrigger>
        </TabsList>

        <TabsContent value="docs" className="flex-1 min-h-0 mt-0">
          <ScrollArea className="h-full">
            {hasError ? (
              <div className="p-4 text-center text-muted-foreground">
                Failed to parse schema
              </div>
            ) : (
              <SchemaDocView schema={jsonSchema} />
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="tree" className="flex-1 min-h-0 mt-0">
          <ScrollArea className="h-full">
            <div className="p-4">
              <JsonTreeViewer
                data={jsonSchema}
                rootName="schema"
                defaultExpanded={true}
                showRoot={false}
              />
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}
