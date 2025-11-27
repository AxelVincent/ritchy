import { DynamicBadgeList } from '@/components/common/DynamicBadgeList'
import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { ClickableCell } from './utils/ClickableCell'
import { HeaderWrapper } from './utils/HeaderWrapper'

export const typesColumn: ColumnDef<SearchResult> = {
  id: 'types',
  accessorKey: 'types',
  size: 200,
  enableColumnFilter: true,
  meta: {
    filterVariant: 'multi-select',
    defaultVisible: false,
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
      <ClickableCell placeId={row.original.id} tab="details">
        <DynamicBadgeList
          items={types}
          badgeVariant="secondary"
          containerPadding={60}
        />
      </ClickableCell>
    )
  },
}
