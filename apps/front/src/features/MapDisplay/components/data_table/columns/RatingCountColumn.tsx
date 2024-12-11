import { TextWrapper } from '@/components/common/TextWrapper'
import { Button } from '@/components/ui/button'
import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown } from 'lucide-react'

export const ratingCountColumn: ColumnDef<SearchResult> = {
  id: 'userRatingCount',
  accessorKey: 'userRatingCount',
  header: ({ column }) => {
    return (
      <TextWrapper>
        <Button
          variant="secondary"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Reviews
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      </TextWrapper>
    )
  },
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
          <span className="text-muted-foreground">No reviews</span>
        )}
      </TextWrapper>
    )
  },
}
