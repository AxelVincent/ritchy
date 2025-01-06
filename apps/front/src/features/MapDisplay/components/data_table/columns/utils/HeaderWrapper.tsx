import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { SearchResult } from '@ritchy/types'
import type { Column } from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { Filter } from './Filter'

export const HeaderWrapper = ({
  column,
  title,
}: {
  column: Column<SearchResult>
  title: string
}) => (
  <div className="flex flex-col gap-2 p-2">
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 hover:bg-transparent"
        >
          <div className="flex items-center gap-1">
            <span className="font-medium">{title}</span>
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ArrowUpDown
                className="h-3.5 w-3.5 opacity-50"
                aria-hidden="true"
              />
            )}
          </div>
          <span className="sr-only">
            {column.getIsSorted()
              ? `Sorted ${column.getIsSorted() === 'asc' ? 'ascending' : 'descending'}`
              : 'Not sorted. Click to sort ascending'}
          </span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        Click to {column.getIsSorted() ? 'change sort direction' : 'sort'}
      </TooltipContent>
    </Tooltip>

    <div className={`${!column.getCanFilter() ? 'h-9' : ''}`}>
      {column.getCanFilter() && <Filter column={column} />}
    </div>
  </div>
)
