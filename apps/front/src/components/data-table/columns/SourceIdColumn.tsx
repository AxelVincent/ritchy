import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { ColumnPinCopyCell } from './utils/ColumnCells'
import { HeaderWrapper } from './utils/HeaderWrapper'

export const sourceIdColumn: ColumnDef<SearchResult> = {
  id: 'sourceId',
  accessorKey: 'sourceId',
  size: 150,
  meta: {
    filterVariant: 'text',
  },
  header: ({ column }) => {
    return <HeaderWrapper column={column} title="Source ID" />
  },
  cell: ({ row }) => {
    return (
      <ColumnPinCopyCell id={row.original.id} content={row.original.sourceId} />
    )
  },
}
