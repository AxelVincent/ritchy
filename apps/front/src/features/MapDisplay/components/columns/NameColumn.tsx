import { Button } from '@/components/ui/button'
import type { ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown } from 'lucide-react'
import type { SearchResult } from '../Columns'
import { CellWrapper } from './CellWrapper'

export const nameColumn: ColumnDef<SearchResult> = {
  id: 'displayName',
  accessorKey: 'displayName',
  header: ({ column }) => {
    return (
      <CellWrapper>
        <Button
          variant="secondary"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      </CellWrapper>
    )
  },
  enableSorting: true,
  sortingFn: 'text',
  cell: ({ row }) => {
    return (
      <CellWrapper
        copyValue={row.original.displayName}
        truncate={true}
        maxWidth="250px"
      >
        {row.original.displayName}
      </CellWrapper>
    )
  }
}
