import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { ColumnPinCopyCell } from './utils/ColumnCells'
import { HeaderWrapper } from './utils/HeaderWrapper'

export const descriptionColumn: ColumnDef<SearchResult> = {
  id: 'description',
  accessorKey: 'description',
  size: 250,
  meta: {
    filterVariant: 'text',
  },
  header: ({ column }) => {
    return <HeaderWrapper column={column} title="Description" width="250px" />
  },
  cell: ({ row, table }) => {
    return (
      <ColumnPinCopyCell
        row={row}
        table={table}
        content={row.original.editorialSummary?.text ?? ''}
      />
    )
  },
}
