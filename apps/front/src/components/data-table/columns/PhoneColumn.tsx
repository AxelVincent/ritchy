import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { ColumnPinCopyCell } from './utils/ColumnCells'
import { HeaderWrapper } from './utils/HeaderWrapper'

export const phoneColumn: ColumnDef<SearchResult> = {
  id: 'phone',
  accessorKey: 'phone',
  size: 200,
  meta: {
    filterVariant: 'text',
  },
  header: ({ column }) => <HeaderWrapper column={column} title="Phone" />,
  cell: ({ row, table }) => {
    const phone = row.getValue('phone') as string
    return <ColumnPinCopyCell row={row} table={table} content={phone} />
  },
}
