import { TextWrapper } from '@/components/common/TextWrapper'
import { Button } from '@/components/ui/button'
import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown, Star } from 'lucide-react'

export const ratingColumn: ColumnDef<SearchResult> = {
  id: 'rating',
  accessorKey: 'rating',
  header: ({ column }) => {
    return (
      <TextWrapper>
        <Button
          variant="secondary"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Rating
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
    const rating = row.original.rating

    return (
      <TextWrapper>
        {rating ? (
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span>{rating.toFixed(1)}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">No rating</span>
        )}
      </TextWrapper>
    )
  },
}
