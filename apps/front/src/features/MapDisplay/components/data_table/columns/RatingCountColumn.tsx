import { TextWrapper } from '@/components/common/TextWrapper'
import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { HeaderWrapper } from './utils/HeaderWrapper'

export const ratingCountColumn: ColumnDef<SearchResult> = {
  id: 'userRatingCount',
  accessorKey: 'userRatingCount',
  meta: {
    filterVariant: 'range',
  },
  header: ({ column }) => (
    <HeaderWrapper column={column} title="Reviews" width="250px" />
  ),
  enableSorting: true,
  sortingFn: 'alphanumeric',
  sortUndefined: -1,
  sortDescFirst: true,
  cell: ({ row }) => {
    const count = row.original.userRatingCount

    return (
      <TextWrapper>
        {count ? (
          <span>{count.toLocaleString()} reviews</span>
        ) : (
          <span className="text-muted-foreground">0 reviews</span>
        )}
      </TextWrapper>
    )
  },
}
