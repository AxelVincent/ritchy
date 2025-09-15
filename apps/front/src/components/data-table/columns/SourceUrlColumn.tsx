import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { ColumnPinCopyCell } from './utils/ColumnCells'
import { HeaderWrapper } from './utils/HeaderWrapper'

export const sourceUrlColumn: ColumnDef<SearchResult> = {
  id: 'sourceUrl',
  accessorKey: 'sourceUrl',
  size: 200,
  meta: {
    filterVariant: 'text',
  },
  header: ({ column }) => {
    return <HeaderWrapper column={column} title="Source URL" />
  },
  cell: ({ row }) => {
    return (
      <ColumnPinCopyCell
        id={row.original.id}
        content={row.original.sourceUrl || ''}
        href={row.original.sourceUrl || undefined}
      />
    )
  },
}
