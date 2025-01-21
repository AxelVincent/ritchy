import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { Star } from 'lucide-react'
import { ColumnPinCell } from './utils/ColumnCells'
import { HeaderWrapper } from './utils/HeaderWrapper'

export const ratingColumn: ColumnDef<SearchResult> = {
  id: 'rating',
  accessorKey: 'rating',
  size: 200,
  meta: {
    filterVariant: 'range',
  },
  header: ({ column }) => <HeaderWrapper column={column} title="Rating" />,
  enableSorting: true,
  sortingFn: 'alphanumeric',
  sortUndefined: -1,
  sortDescFirst: true,
  cell: ({ row, table }) => {
    const rating = row.original.rating

    return (
      <ColumnPinCell
        row={row}
        table={table}
        content={
          rating ? (
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span>{rating.toFixed(1)}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">No rating</span>
          )
        }
      />
    )
  },
}
