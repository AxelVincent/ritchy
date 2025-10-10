import { useEnrichmentStatus } from '@/api/queries/enrichment/useEnrichmentStatus'
import { usePlaceEnrichmentQuery } from '@/api/queries/places/enrichment/usePlaceEnrichment'
import { useMapStore } from '@/components/map-display/store/useMapStore'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useEnrichmentMutation } from '@/contexts/EnrichmentMutationContext'
import { cn } from '@/lib/utils'
import type { Financial, Place } from '@ritchy/types'
import {
  ChevronDown,
  ChevronRight,
  Clock,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
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

const JsonViewer = ({
  data,
  level = 0,
  focusPath = null,
  currentPath = '',
}: {
  data: unknown
  level?: number
  focusPath?: string | null
  currentPath?: string
}) => {
  // Check if this path matches the focus path or is a parent/child of it
  const shouldAutoExpand =
    focusPath &&
    // Exact match
    (focusPath === currentPath ||
      // This is a parent of the focus path
      (currentPath === ''
        ? focusPath.includes('.')
        : focusPath.startsWith(`${currentPath}.`)) ||
      // This is a direct child of the focus path (e.g., focusPath is 'company.officers', currentPath is 'company.officers[0]')
      currentPath.startsWith(`${focusPath}[`))

  const [isOpen, setIsOpen] = useState(level < 2 || !!shouldAutoExpand)
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-expand if this is in the focus path
  useEffect(() => {
    if (shouldAutoExpand) {
      setIsOpen(true)

      // If this is the exact field, scroll to it
      if (focusPath === currentPath && containerRef.current) {
        setTimeout(() => {
          containerRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          })
        }, 500) // Increased timeout to allow all nested collapsibles to open
      }
    }
  }, [focusPath, currentPath, shouldAutoExpand])

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

    // Regular string - make it wrap properly
    return (
      <span className="text-green-600 dark:text-green-400 break-all">
        "{data}"
      </span>
    )
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

    const isExactMatch = focusPath === currentPath

    return (
      <div
        ref={isExactMatch ? containerRef : null}
        className={cn(
          'max-w-full overflow-x-auto',
          isExactMatch && 'bg-blue-500/10 ring-2 ring-blue-500 rounded-md p-2',
        )}
      >
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
                const itemPath = `${currentPath}[${index}]`
                const renderedItem = (
                  <JsonViewer
                    data={item}
                    level={level + 1}
                    focusPath={focusPath}
                    currentPath={itemPath}
                  />
                )
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
      </div>
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

      const isExactMatch = focusPath === currentPath

      return (
        <div
          ref={isExactMatch ? containerRef : null}
          className={cn(
            'max-w-full overflow-x-auto',
            isExactMatch &&
              'bg-blue-500/10 ring-2 ring-blue-500 rounded-md p-2',
          )}
        >
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
                  const fieldPath = currentPath ? `${currentPath}.${key}` : key
                  const renderedValue = (
                    <JsonViewer
                      data={otherData[key]}
                      level={level + 1}
                      focusPath={focusPath}
                      currentPath={fieldPath}
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
        </div>
      )
    }

    // Regular object handling for objects without financials
    const nonEmptyKeys = Object.keys(data).filter(
      (key) => !isEmpty(data[key as keyof typeof data]),
    )
    if (nonEmptyKeys.length === 0) return null

    const isExactMatch = focusPath === currentPath

    return (
      <div
        ref={isExactMatch ? containerRef : null}
        className={cn(
          'max-w-full overflow-x-auto',
          isExactMatch && 'bg-blue-500/10 ring-2 ring-blue-500 rounded-md p-2',
        )}
      >
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
                const fieldPath = currentPath ? `${currentPath}.${key}` : key
                const renderedValue = (
                  <JsonViewer
                    data={data[key as keyof typeof data]}
                    level={level + 1}
                    focusPath={focusPath}
                    currentPath={fieldPath}
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
      </div>
    )
  }

  return <span className="text-muted-foreground">{String(data)}</span>
}

export const PlaceCompanyDetailsTab = ({ place }: { place: Place }) => {
  const { data, isLoading, error } = usePlaceEnrichmentQuery(place.id)
  const { data: enrichmentStatus } = useEnrichmentStatus(place.id)
  const mutation = useEnrichmentMutation()
  const { focusField } = useMapStore()

  const handleEnrich = () => {
    mutation.mutate({ userPlaceId: place.id })
  }

  // Show enrichment progress if actively processing
  if (
    enrichmentStatus?.status === 'queued' ||
    enrichmentStatus?.status === 'processing'
  ) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center space-y-2">
            {enrichmentStatus.status === 'queued' ? (
              <>
                <Clock className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold">Enrichment Queued</h3>
                <p className="text-sm text-muted-foreground">
                  Your enrichment request is in the queue and will start
                  shortly...
                </p>
              </>
            ) : (
              <>
                <Loader2 className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-4" />
                <h3 className="text-lg font-semibold">
                  Enriching Company Data
                </h3>
              </>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{enrichmentStatus.progress}%</span>
            </div>
            <Progress value={enrichmentStatus.progress} className="h-2" />
          </div>

          {enrichmentStatus.status === 'processing' &&
            enrichmentStatus.step && (
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">
                  Current Step:
                </p>
                <p className="text-sm font-medium">{enrichmentStatus.step}</p>
              </div>
            )}

          <div className="text-xs text-center text-muted-foreground">
            This page will automatically update when enrichment completes
          </div>
        </div>
      </div>
    )
  }

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

  // Show enrichment trigger button when data isn't enriched
  if (!data || 'error' in data || data?.id === null) {
    const isPending = mutation.isPending

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-sm space-y-6">
          <div className="space-y-2">
            <Sparkles className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground">
              No Enrichment Data Available
            </h3>
            <p className="text-sm text-muted-foreground">
              Enrich this place to view company details, descriptions, and
              governmental data
            </p>
          </div>

          <Button
            onClick={handleEnrich}
            disabled={isPending}
            size="lg"
            className="gap-2"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Starting Enrichment...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Enrich This Place
              </>
            )}
          </Button>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>Enrichment includes:</p>
            <ul className="list-disc list-inside text-left inline-block">
              <li>Company description</li>
              <li>Contact information</li>
              <li>Governmental data</li>
              <li>Financial information</li>
              <li>Social media profiles</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <ScrollArea className="flex-1">
        <div className="pr-4 max-w-full overflow-x-auto">
          <JsonViewer data={data} focusPath={focusField} />{' '}
          {/* Pass focusField */}
        </div>
      </ScrollArea>
    </div>
  )
}
