import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { ColumnPinCell } from './utils/ColumnCells'
import { HeaderWrapper } from './utils/HeaderWrapper'

export const ratingCountColumn: ColumnDef<SearchResult> = {
  id: 'ratingCount',
  accessorKey: 'ratingCount',
  size: 200,
  meta: {
    filterVariant: 'range',
  },
  header: ({ column }) => (
    <HeaderWrapper column={column} title="Rating Count" />
  ),
  enableSorting: true,
  sortingFn: 'alphanumeric',
  sortUndefined: -1,
  sortDescFirst: true,
  cell: ({ row, table }) => {
    const count = row.original.ratingCount

    return (
      <ColumnPinCell
        row={row}
        table={table}
        content={
          count ? (
            <span>{count.toLocaleString()} reviews</span>
          ) : (
            <span className="text-muted-foreground">0 reviews</span>
          )
        }
      />
    )
  },
}
