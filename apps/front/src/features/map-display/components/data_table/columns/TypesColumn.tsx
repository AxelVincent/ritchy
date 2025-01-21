import { DynamicBadgeList } from '@/features/map-display/components/shared/DynamicBadgeList'
import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { ColumnPinCell } from './utils/ColumnCells'
import { HeaderWrapper } from './utils/HeaderWrapper'

export const typesColumn: ColumnDef<SearchResult> = {
  id: 'types',
  accessorKey: 'types',
  size: 350,
  enableColumnFilter: true,
  meta: {
    filterVariant: 'multi-select',
  },
  filterFn: (row, id, filterValue: string[]) => {
    if (!filterValue?.length) return true
    const rowTypes = row.getValue(id) as string[]
    return filterValue.some((filter) => rowTypes.includes(filter))
  },
  header: ({ column }) => (
    <HeaderWrapper column={column} title="Types" width="350px" />
  ),
  cell: ({ row, table }) => {
    const types = row.original.types

    return (
      <ColumnPinCell
        row={row}
        table={table}
        content={
          <DynamicBadgeList
            items={types}
            badgeVariant="secondary"
            containerPadding={60}
          />
        }
      />
    )
  },
}
