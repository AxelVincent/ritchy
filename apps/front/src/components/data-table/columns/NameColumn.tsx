import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { HeaderWrapper } from './utils/HeaderWrapper'

import { ColumnPinCopyCell } from './utils/ColumnCells'

export const nameColumn: ColumnDef<SearchResult> = {
  id: 'name',
  accessorKey: 'name',
  size: 200,
  meta: {
    filterVariant: 'text',
  },
  header: ({ column }) => {
    return <HeaderWrapper column={column} title="Name" />
  },
  cell: ({ row }) => {
    return (
      <ColumnPinCopyCell id={row.original.id} content={row.original.name} />
    )
  },
}
