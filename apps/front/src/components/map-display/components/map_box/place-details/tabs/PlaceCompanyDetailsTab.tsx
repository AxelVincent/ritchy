import { usePlaceEnrichmentQuery } from '@/api/queries/places/enrichment/usePlaceEnrichment'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Financial, Place } from '@ritchy/types'
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'

const FinancialsTable = ({ financials }: { financials: Financial }) => {
  const [isFinancialsOpen, setIsFinancialsOpen] = useState(false)

  if (!financials || financials.length === 0) return null

  // Get all unique ratio keys across all financial periods
  const allRatioKeys = new Set<string>()
  for (const financial of financials) {
    if (financial.ratios) {
      for (const key of Object.keys(financial.ratios)) {
        const value = financial.ratios[key as keyof typeof financial.ratios]
        if (value !== null && value !== undefined && value !== 0) {
          allRatioKeys.add(key)
        }
      }
    }
  }

  if (allRatioKeys.size === 0) return null

  const formatKey = (key: string) =>
    key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())

  const formatValue = (value: unknown) => {
    if (typeof value === 'number') return value.toLocaleString()
    if (typeof value === 'string') return value
    return '-'
  }

  const ratioKeysArray = Array.from(allRatioKeys)
  const previewKeys = ratioKeysArray.slice(0, 3)
  const hasMoreRows = ratioKeysArray.length > 3

  return (
    <div className="space-y-2">
      <Collapsible open={isFinancialsOpen} onOpenChange={setIsFinancialsOpen}>
        <div className="space-y-2">
          <CollapsibleTrigger className="flex items-center gap-2 hover:bg-muted/50 rounded px-2 py-1 w-full text-left">
            {isFinancialsOpen ? (
              <ChevronDown className="h-3 w-3 flex-shrink-0" />
            ) : (
              <ChevronRight className="h-3 w-3 flex-shrink-0" />
            )}
            <Badge variant="secondary" className="text-xs flex-shrink-0">
              Financial Data
            </Badge>
            <span className="text-xs text-muted-foreground flex-shrink-0">
              ({financials.length} periods)
            </span>
            {hasMoreRows && !isFinancialsOpen && (
              <span className="text-xs text-muted-foreground">
                • {ratioKeysArray.length} metrics
              </span>
            )}
          </CollapsibleTrigger>

          {!isFinancialsOpen && (
            <div className="border rounded-lg bg-muted/30 ml-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Metric</TableHead>
                    {financials.map((financial, index) => (
                      <TableHead
                        key={financial.id || index}
                        className="text-xs text-right"
                      >
                        <div className="space-y-1">
                          <div>{financial.type || `Period ${index + 1}`}</div>
                          <div className="text-muted-foreground font-normal">
                            {financial.financialsStartDate?.split('T')[0]} -{' '}
                            {financial.financialsEndDate?.split('T')[0]}
                          </div>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewKeys.map((key) => (
                    <TableRow key={key}>
                      <TableCell className="text-xs font-medium">
                        {formatKey(key)}
                      </TableCell>
                      {financials.map((financial, index) => (
                        <TableCell
                          key={financial.id || index}
                          className="text-xs text-right"
                        >
                          {formatValue(
                            financial.ratios?.[
                              key as keyof typeof financial.ratios
                            ],
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {hasMoreRows && (
                <div className="text-xs text-muted-foreground p-3 border-t italic">
                  ... {ratioKeysArray.length - 3} more metrics
                </div>
              )}
            </div>
          )}
        </div>

        <CollapsibleContent className="mt-2">
          <div className="border rounded-lg bg-muted/30 ml-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Metric</TableHead>
                  {financials.map((financial, index) => (
                    <TableHead
                      key={financial.id || index}
                      className="text-xs text-right"
                    >
                      <div className="space-y-1">
                        <div>{financial.type || `Period ${index + 1}`}</div>
                        <div className="text-muted-foreground font-normal">
                          {financial.financialsStartDate?.split('T')[0]} -{' '}
                          {financial.financialsEndDate?.split('T')[0]}
                        </div>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {ratioKeysArray.map((key) => (
                  <TableRow key={key}>
                    <TableCell className="text-xs font-medium">
                      {formatKey(key)}
                    </TableCell>
                    {financials.map((financial, index) => (
                      <TableCell
                        key={financial.id || index}
                        className="text-xs text-right"
                      >
                        {formatValue(
                          financial.ratios?.[
                            key as keyof typeof financial.ratios
                          ],
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

const JsonViewer = ({ data, level = 0 }: { data: unknown; level?: number }) => {
  const [isOpen, setIsOpen] = useState(level < 2)

  // Helper function to check if a value is empty
  const isEmpty = (value: unknown): boolean => {
    if (value === null || value === undefined) return true
    if (typeof value === 'string' && value.trim() === '') return true
    if (Array.isArray(value) && value.length === 0) return true
    if (
      typeof value === 'object' &&
      value !== null &&
      Object.keys(value).length === 0
    )
      return true
    return false
  }

  // Return null for empty values to hide them completely
  if (isEmpty(data)) return null

  if (typeof data === 'string') {
    // Check if this looks like markdown (contains markdown syntax)
    const isMarkdown =
      data.includes('\n') ||
      data.includes('#') ||
      data.includes('*') ||
      data.includes('**')

    if (isMarkdown && data.length > 50) {
      const [isMarkdownOpen, setIsMarkdownOpen] = useState(false)
      const lines = data.split('\n')
      const previewLines = lines.slice(0, 3).join('\n')
      const hasMoreContent = lines.length > 3

      return (
        <div className="space-y-2">
          <Collapsible open={isMarkdownOpen} onOpenChange={setIsMarkdownOpen}>
            <div className="space-y-2">
              <CollapsibleTrigger className="flex items-center gap-2 hover:bg-muted/50 rounded px-2 py-1 w-full text-left">
                {isMarkdownOpen ? (
                  <ChevronDown className="h-3 w-3 flex-shrink-0" />
                ) : (
                  <ChevronRight className="h-3 w-3 flex-shrink-0" />
                )}
                <Badge variant="secondary" className="text-xs flex-shrink-0">
                  Markdown
                </Badge>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  ({data.length} chars)
                </span>
                {hasMoreContent && !isMarkdownOpen && (
                  <span className="text-xs text-muted-foreground">
                    • {lines.length} lines
                  </span>
                )}
              </CollapsibleTrigger>

              {!isMarkdownOpen && (
                <div className="border rounded-lg p-3 bg-muted/30 ml-6">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{previewLines}</ReactMarkdown>
                    {hasMoreContent && (
                      <div className="text-xs text-muted-foreground mt-2 italic border-t pt-2">
                        ... {lines.length - 3} more lines
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <CollapsibleContent className="mt-2">
              <div className="border rounded-lg p-3 bg-muted/30 ml-6">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{data}</ReactMarkdown>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )
    }

    return <span className="text-green-600 dark:text-green-400">"{data}"</span>
  }

  if (typeof data === 'number') {
    return <span className="text-blue-600 dark:text-blue-400">{data}</span>
  }

  if (typeof data === 'boolean') {
    return (
      <span className="text-purple-600 dark:text-purple-400">
        {data.toString()}
      </span>
    )
  }

  if (Array.isArray(data)) {
    // Filter out empty items
    const nonEmptyItems = data.filter((item) => !isEmpty(item))
    if (nonEmptyItems.length === 0) return null

    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex items-center gap-1 hover:bg-muted/50 rounded px-1">
          {isOpen ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
          <span className="text-muted-foreground">
            [{nonEmptyItems.length} items]
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent className="ml-4 border-l border-muted pl-2 mt-1">
          {nonEmptyItems
            .map((item, index) => {
              const renderedItem = <JsonViewer data={item} level={level + 1} />
              // Only render if the item produces content
              if (renderedItem === null) return null

              return (
                <div key={`${index + level}`} className="py-1">
                  <span className="text-muted-foreground text-xs mr-2">
                    {index}:
                  </span>
                  {renderedItem}
                </div>
              )
            })
            .filter(Boolean)}
        </CollapsibleContent>
      </Collapsible>
    )
  }

  if (typeof data === 'object' && data !== null) {
    // Check if this object has financials
    const hasFinancials =
      'financials' in data &&
      Array.isArray(data.financials) &&
      data.financials.length > 0

    if (hasFinancials) {
      const { financials, ...otherData } = data as Record<string, unknown>

      // Filter out keys with empty values (excluding financials)
      const nonEmptyKeys = Object.keys(otherData).filter(
        (key) => !isEmpty(otherData[key]),
      )

      return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger className="flex items-center gap-1 hover:bg-muted/50 rounded px-1">
            {isOpen ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            <span className="text-muted-foreground">{`{${nonEmptyKeys.length + 1} keys}`}</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="ml-4 border-l border-muted pl-2 mt-1">
            {/* Render all other data first */}
            {nonEmptyKeys
              .map((key) => {
                const renderedValue = (
                  <JsonViewer data={otherData[key]} level={level + 1} />
                )
                if (renderedValue === null) return null

                return (
                  <div key={key} className="py-1">
                    <span className="text-orange-600 dark:text-orange-400 font-medium mr-2">
                      "{key}":
                    </span>
                    {renderedValue}
                  </div>
                )
              })
              .filter(Boolean)}

            {/* Render financials last with special formatting */}
            <div className="py-1">
              <span className="text-orange-600 dark:text-orange-400 font-medium mr-2">
                "financials":
              </span>
              <div className="mt-2">
                <FinancialsTable financials={financials as Financial} />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )
    }

    // Regular object handling for objects without financials
    const nonEmptyKeys = Object.keys(data).filter(
      (key) => !isEmpty(data[key as keyof typeof data]),
    )
    if (nonEmptyKeys.length === 0) return null

    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex items-center gap-1 hover:bg-muted/50 rounded px-1">
          {isOpen ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
          <span className="text-muted-foreground">{`{${nonEmptyKeys.length} keys}`}</span>
        </CollapsibleTrigger>
        <CollapsibleContent className="ml-4 border-l border-muted pl-2 mt-1">
          {nonEmptyKeys
            .map((key) => {
              const renderedValue = (
                <JsonViewer
                  data={data[key as keyof typeof data]}
                  level={level + 1}
                />
              )
              if (renderedValue === null) return null

              return (
                <div key={key} className="py-1">
                  <span className="text-orange-600 dark:text-orange-400 font-medium mr-2">
                    "{key}":
                  </span>
                  {renderedValue}
                </div>
              )
            })
            .filter(Boolean)}
        </CollapsibleContent>
      </Collapsible>
    )
  }

  return <span className="text-muted-foreground">{String(data)}</span>
}

export const PlaceCompanyDetailsTab = ({ place }: { place: Place }) => {
  const { data, isLoading, error } = usePlaceEnrichmentQuery(place.id)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-sm text-destructive">
        Error loading enrichment: {error.message}
      </div>
    )
  }

  if (!data || 'error' in data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-sm space-y-4">
          <h3 className="text-lg font-semibold text-muted-foreground">
            Enrichment required for description and governmental data
          </h3>
        </div>
      </div>
    )
  }

  if (data?.id === null) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-sm space-y-4">
          <h3 className="text-lg font-semibold text-muted-foreground">
            Enrichment required for description and governmental data
          </h3>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <ScrollArea className="flex-1">
        <JsonViewer data={data} />
      </ScrollArea>
    </div>
  )
}
