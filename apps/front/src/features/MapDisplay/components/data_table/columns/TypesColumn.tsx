import { DynamicBadgeList } from '@/features/MapDisplay/components/shared/DynamicBadgeList'
import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { HeaderWrapper } from './utils/HeaderWrapper'

export const typesColumn: ColumnDef<SearchResult> = {
  id: 'types',
  accessorKey: 'types',
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
  cell: ({ row }) => {
    const types = row.original.types

    return (
      <div className="w-[350px]">
        <DynamicBadgeList
          items={types}
          badgeVariant="secondary"
          containerClassName="w-[350px]"
          containerPadding={60}
        />
      </div>
    )
  },
}
