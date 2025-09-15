import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { ColumnPinCopyCell } from './utils/ColumnCells'
import { HeaderWrapper } from './utils/HeaderWrapper'

export const sourceColumn: ColumnDef<SearchResult> = {
  id: 'source',
  accessorKey: 'source',
  size: 120,
  meta: {
    filterVariant: 'multi-select',
  },
  header: ({ column }) => {
    return <HeaderWrapper column={column} title="Source" />
  },
  cell: ({ row }) => {
    return (
      <ColumnPinCopyCell id={row.original.id} content={row.original.source} />
    )
  },
}
