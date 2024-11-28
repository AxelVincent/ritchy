import { Button } from '@/components/ui/button'
import type { ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown } from 'lucide-react'
import type { SearchResult } from '../Columns'
import { CellWrapper } from './CellWrapper'

export const nameColumn: ColumnDef<SearchResult> = {
  accessorKey: 'name',
  header: ({ column }) => {
    return (
      <CellWrapper>
        <Button
          variant="ghost"
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
    return <CellWrapper>{row.original.displayName}</CellWrapper>
  }
}
