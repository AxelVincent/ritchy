import { DynamicBadgeList } from '@/components/common/DynamicBadgeList'
import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { SimpleCell } from './utils/ColumnCells'
import { HeaderWrapper } from './utils/HeaderWrapper'

export const technologiesColumn: ColumnDef<SearchResult> = {
  id: 'technologies',
  accessorKey: 'companyTechnologies',
  size: 200,
  enableColumnFilter: true,
  meta: {
    filterVariant: 'multi-select',
    isEnrichment: true,
  },
  filterFn: (row, id, filterValue: string[]) => {
    if (!filterValue?.length) return true
    const rowTechnologies = row.getValue(id) as string[]
    return filterValue.some((filter) => rowTechnologies.includes(filter))
  },
  header: ({ column }) => (
    <HeaderWrapper column={column} title="Technologies" />
  ),
  cell: ({ row }) => {
    const technologies = row.original.companyTechnologies || []

    return (
      <SimpleCell>
        <DynamicBadgeList
          items={technologies}
          badgeVariant="secondary"
          containerPadding={60}
        />
      </SimpleCell>
    )
  },
}
