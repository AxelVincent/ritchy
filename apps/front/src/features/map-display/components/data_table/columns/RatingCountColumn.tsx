import { TextWrapper } from '@/components/common/TextWrapper'
import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { HeaderWrapper } from './utils/HeaderWrapper'

export const ratingCountColumn: ColumnDef<SearchResult> = {
  id: 'userRatingCount',
  accessorKey: 'userRatingCount',
  size: 250,
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
  cell: ({ row, table }) => {
    const count = row.original.userRatingCount

    return (
      <TextWrapper
        id={row.original.id}
        actions={[
          {
            icon: 'MapPinned',
            onClick: () => {
              table.options.meta?.setSelectedPlaceId?.(row.original.id)
            },
            label: 'Pin to map',
          },
        ]}
      >
        {count ? (
          <span>{count.toLocaleString()} reviews</span>
        ) : (
          <span className="text-muted-foreground">0 reviews</span>
        )}
      </TextWrapper>
    )
  },
}
