import { TextWrapper } from '@/components/common/TextWrapper'
import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { DynamicBadgeList } from '../../shared/DynamicBadgeList'
import { HeaderWrapper } from './utils/HeaderWrapper'

const formatList = (
  list: NonNullable<SearchResult['associatedLists']>[number],
) => `${list.emoji} ${list.name}`

const NO_LISTS_LABEL = 'No lists'

export const associatedListsColumn: ColumnDef<SearchResult> = {
  id: 'associatedLists',
  size: 200,
  accessorFn: (row) => {
    const lists = row.associatedLists ?? []
    return lists.length ? lists.map(formatList) : [NO_LISTS_LABEL]
  },
  enableColumnFilter: true,
  filterFn: (row, columnId, filterValue: string[]) => {
    if (!filterValue?.length) return true
    const formattedLists = row.getValue(columnId) as string[]
    if (
      filterValue.includes(NO_LISTS_LABEL) &&
      formattedLists.includes(NO_LISTS_LABEL)
    ) {
      return true
    }
    return filterValue.some((filter) => formattedLists.includes(filter))
  },
  meta: {
    filterVariant: 'multi-select',
    getFacetedUniqueValues: (rows) => {
      const uniqueLists = new Set<string>([NO_LISTS_LABEL])
      for (const row of rows) {
        for (const list of row.original.associatedLists ?? []) {
          uniqueLists.add(formatList(list))
        }
      }
      return Array.from(uniqueLists)
    },
  },
  header: ({ column }) => (
    <HeaderWrapper column={column} title="Lists" width="200px" />
  ),
  cell: ({ row, table }) => {
    const lists = row.original.associatedLists

    return (
      <TextWrapper
        id={row.original.id}
        actions={[
          {
            icon: 'MapPinned',
            onClick: () => {
              table.options.meta?.setSelectedPlaceId?.(row.original.id)
            },
            label: 'Pin to map',
          },
        ]}
      >
        {lists?.length ? (
          <DynamicBadgeList
            items={lists.map(formatList)}
            badgeVariant="secondary"
            containerClassName="w-[200px]"
            containerPadding={60}
          />
        ) : (
          ''
        )}
      </TextWrapper>
    )
  },
}
