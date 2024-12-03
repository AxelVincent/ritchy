import { Button } from '@/components/ui/button'
import type { ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown } from 'lucide-react'
import type { SearchResult } from '../Columns'
import { CellWrapper } from './CellWrapper'

export const ratingCountColumn: ColumnDef<SearchResult> = {
  id: 'userRatingCount',
  accessorKey: 'userRatingCount',
  header: ({ column }) => {
    return (
      <CellWrapper>
        <Button
          variant="secondary"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Reviews
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      </CellWrapper>
    )
  },
  enableSorting: true,
  sortingFn: 'alphanumeric',
  sortUndefined: -1,
  sortDescFirst: true,
  cell: ({ row }) => {
    const count = row.original.userRatingCount

    return (
      <CellWrapper>
        {count ? (
          <span>{count.toLocaleString()} reviews</span>
        ) : (
          <span className="text-muted-foreground">No reviews</span>
        )}
      </CellWrapper>
    )
  },
}
