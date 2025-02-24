import { cn } from '@/lib/utils'
import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { Loader2 } from 'lucide-react'
import { HeaderWrapper } from './utils/HeaderWrapper'

// TODO: Remove this column after split of enrichment data
export const asyncScoreColumn: ColumnDef<SearchResult> = {
  id: 'asyncScore',
  accessorFn: (row) => {
    const scoreState = row.asyncScore
    return scoreState?.score ?? null
  },
  size: 200,
  meta: {
    filterVariant: 'range',
  },
  header: ({ column }) => {
    return <HeaderWrapper column={column} title="Async Score" />
  },
  enableSorting: true,
  cell: ({ row }) => {
    const scoreState = row.original.asyncScore

    return (
      <div className="flex items-center justify-end pr-4">
        <div
          className={cn(
            'transition-opacity duration-200',
            scoreState?.isLoading && 'opacity-50',
          )}
        >
          {scoreState?.isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              Loading...
            </div>
          ) : scoreState?.error ? (
            <div className="text-destructive text-sm" title={scoreState.error}>
              Error
            </div>
          ) : scoreState?.score !== undefined ? (
            scoreState.score
          ) : (
            ''
          )}
        </div>
      </div>
    )
  },
}
