import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { ClickableCell } from './utils/ClickableCell'
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
  cell: ({ row }) => {
    const count = row.original.ratingCount

    return (
      <ClickableCell placeId={row.original.id} tab="details">
        {count ? (
          <span>{count.toLocaleString()} reviews</span>
        ) : (
          <span className="text-muted-foreground">0 reviews</span>
        )}
      </ClickableCell>
    )
  },
}
