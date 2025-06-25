import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { SearchResult } from '@ritchy/types'
import type { Column } from '@tanstack/react-table'
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
        {helper && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="ml-2 cursor-help text-muted-foreground flex-shrink-0">
                <HelpCircle className="h-4 w-4" aria-label="Help" />
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
