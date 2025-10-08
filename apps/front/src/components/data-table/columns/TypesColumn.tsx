import { DynamicBadgeList } from '@/components/common/DynamicBadgeList'
import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { SimpleCell } from './utils/ColumnCells'
import { HeaderWrapper } from './utils/HeaderWrapper'

export const typesColumn: ColumnDef<SearchResult> = {
  id: 'types',
  accessorKey: 'types',
  size: 200,
  enableColumnFilter: true,
  meta: {
    filterVariant: 'multi-select',
  },
  filterFn: (row, id, filterValue: string[]) => {
    if (!filterValue?.length) return true
    const rowTypes = row.getValue(id) as string[]
    return filterValue.some((filter) => rowTypes.includes(filter))
  },
  header: ({ column }) => <HeaderWrapper column={column} title="Types" />,
  cell: ({ row }) => {
    const types = row.original.types

    return (
      <SimpleCell>
        <DynamicBadgeList
          items={types}
          badgeVariant="secondary"
          containerPadding={60}
        />
      </SimpleCell>
    )
  },
}
