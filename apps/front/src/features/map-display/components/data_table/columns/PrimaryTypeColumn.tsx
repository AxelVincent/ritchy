import { Badge } from '@/components/ui/badge'
import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { ColumnPinCell } from './utils/ColumnCells'
import { HeaderWrapper } from './utils/HeaderWrapper'

export const primaryTypeColumn: ColumnDef<SearchResult> = {
  id: 'primaryType',
  accessorKey: 'primaryType',
  size: 250,
  meta: {
    filterVariant: 'multi-select',
  },
  header: ({ column }) => (
    <HeaderWrapper column={column} title="Primary Type" width="250px" />
  ),
  cell: ({ row, table }) => (
    <ColumnPinCell
      row={row}
      table={table}
      content={
        row.original.primaryType && (
          <Badge variant="secondary">{row.original.primaryType}</Badge>
        )
      }
    />
  ),
}
