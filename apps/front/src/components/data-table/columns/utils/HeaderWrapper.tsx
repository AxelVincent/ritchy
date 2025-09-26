import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { SearchResult } from '@ritchy/types'
import type { Column } from '@tanstack/react-table'
import { Sparkles } from 'lucide-react'
import { ArrowDown, ArrowUp, ArrowUpDown, HelpCircle } from 'lucide-react'
import { Filter } from './Filter'

export const HeaderWrapper = ({
  column,
  title,
  helper,
}: {
  column: Column<SearchResult>
  title: string
  helper?: React.ReactNode
}) => {
  const canSort = column.getCanSort()

  return (
    <div className="w-full flex flex-col gap-2 p-2">
      <div className="w-full flex items-center justify-between">
        <Tooltip>
          <TooltipTrigger className="flex-1 truncate">
            <Button
              variant="ghost"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (canSort) {
                  column.toggleSorting()
                }
              }}
              onKeyDown={
                canSort
                  ? (e) => {
                      if (e.key === 'Enter') {
                        column.toggleSorting()
                      }
                    }
                  : undefined
              }
              className={`w-full h-8 px-4 py-2 text-left ${!canSort ? 'cursor-default' : ''}`}
              disabled={!canSort}
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-medium truncate">{title}</span>
                {canSort &&
                  (column.getIsSorted() === 'asc' ? (
                    <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : column.getIsSorted() === 'desc' ? (
                    <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <ArrowUpDown
                      className="h-3.5 w-3.5 opacity-50"
                      aria-hidden="true"
                    />
                  ))}
              </div>
              <span className="sr-only">
                {canSort
                  ? column.getIsSorted()
                    ? `Sorted ${column.getIsSorted() === 'asc' ? 'ascending' : 'descending'}`
                    : 'Not sorted. Click to sort ascending'
                  : ''}
              </span>
            </Button>
          </TooltipTrigger>
          {canSort && (
            <TooltipContent>
              {`Click to ${column.getIsSorted() ? 'change sort direction' : 'sort'}`}
            </TooltipContent>
          )}
        </Tooltip>
        <div className="flex items-center gap-2">
          {column.columnDef.meta?.isEnrichment && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="ml-2 cursor-help text-muted-foreground flex-shrink-0">
                  <Sparkles
                    className="h-4 w-4 text-primary"
                    aria-label="Help"
                  />
                </span>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="max-w-xs p-0 bg-transparent border-none shadow-none"
              >
                <Card className="shadow-md">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles
                        className="h-5 w-5 text-primary"
                        aria-label="Sparkles"
                      />
                      <div className="font-semibold text-base">
                        Quick enrichment guide
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      <div className="flex items-start gap-2">
                        <div className="h-5 w-5 flex-shrink-0 flex items-center justify-center">
                          <span className="text-primary">1.</span>
                        </div>
                        <div>
                          Find the enrichment button with the sparkles icon{' '}
                          <Sparkles className="h-4 w-4 inline-block text-primary" />{' '}
                          at the top of your table
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="h-5 w-5 flex-shrink-0 flex items-center justify-center">
                          <span className="text-primary">2.</span>
                        </div>
                        <div>
                          Click it to instantly search and gather fresh data
                          from across the internet
                        </div>
                      </div>
                      <div className="mt-3 bg-muted/30 p-2.5 rounded-md flex items-start gap-2">
                        <div className="flex-shrink-0">💡</div>
                        <div className="text-sm">
                          This smart process checks multiple sources and might
                          take a moment to get you the best results
                        </div>
                      </div>
                      <div className="mt-3 bg-muted/30 p-2.5 rounded-md flex items-start gap-2">
                        <div className="text-sm">
                          Look for the sparkles indicators in enriched cells:
                          <div className="mt-1 space-y-1">
                            <div className="flex items-start gap-2">
                              <Sparkles className="h-2.5 w-2.5 flex-shrink-0 text-blue-600 mt-1.5" />
                              <span>Enriched data</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <Sparkles className="h-2.5 w-2.5 flex-shrink-0 text-purple-600 mt-1.5" />
                              <span>
                                Recently enriched data (last 30 minutes)
                              </span>
                            </div>
                            <div className="flex items-start gap-2">
                              <Sparkles className="h-2.5 w-2.5 flex-shrink-0 text-red-600 mt-1.5" />
                              <span>
                                Enrichment failed, we were unable to find the
                                data (credits refunded)
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TooltipContent>
            </Tooltip>
          )}
          {helper && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="ml-2 cursor-help text-muted-foreground flex-shrink-0">
                  <HelpCircle
                    className="h-4 w-4 text-primary"
                    aria-label="Help"
                  />
                </span>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="max-w-xs p-0 bg-transparent border-none shadow-none"
              >
                {helper}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {column.getCanFilter() && (
        <div
          className="w-full filter-container"
          onKeyDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <Filter column={column} />
        </div>
      )}
    </div>
  )
}
