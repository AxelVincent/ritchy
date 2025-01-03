import { TextWrapper } from '@/components/common/TextWrapper'
import { Button } from '@/components/ui/button'
import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown } from 'lucide-react'

export const nameColumn: ColumnDef<SearchResult> = {
  id: 'displayName',
  accessorKey: 'displayName',
  header: ({ column }) => {
    return (
      <TextWrapper>
        <Button
          variant="secondary"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      </TextWrapper>
    )
  },
  enableSorting: true,
  sortingFn: 'text',
  cell: ({ row }) => {
    return (
      <TextWrapper truncate={true} maxWidth="200px">
        {row.original.displayName}
      </TextWrapper>
    )
  },
}
