import { StatusDropdown } from '@/components/status/status-dropdown'
import { getStatusLabel } from '@/components/status/status-label'
import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { ColumnPinCell } from './utils/ColumnCells'
import { HeaderWrapper } from './utils/HeaderWrapper'

export const statusColumn: ColumnDef<SearchResult> = {
  id: 'status',
  accessorKey: 'status',
  accessorFn: (row) => {
    const status = row.status || 'NEW'
    return getStatusLabel(status)
  },
  size: 200,
  meta: {
    filterVariant: 'multi-select',
  },
  header: ({ column }) => <HeaderWrapper column={column} title="Status" />,
  cell: ({ row }) => {
    return (
      <ColumnPinCell
        id={row.original.id}
        content={
          <StatusDropdown
            userPlaceId={row.original.id}
            currentStatus={row.original.status || 'NEW'}
            listId={row.original.listId}
          />
        }
      />
    )
  },
}
