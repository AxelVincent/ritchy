import { TextWrapper } from '@/components/common/TextWrapper'
import { Badge } from '@/components/ui/badge'
import type { SearchResult } from '@ritchy/types'
import type { Column, ColumnDef } from '@tanstack/react-table'
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
  cell: ({ row }) => {
    const lists = row.original.associatedLists
    if (!lists?.length) return null

    return (
      <TextWrapper truncate={true} width="200px">
        {lists.map((list, index) => (
          <Badge
            key={list.id}
            variant="secondary"
            className={index > 0 ? 'ml-1' : ''}
          >
            {list.emoji} {list.name}
          </Badge>
        ))}
      </TextWrapper>
    )
  },
}

export const useUniqueValues = (column: Column<SearchResult>) => {
  const values = column.getFacetedUniqueValues()
  return Array.from(values.keys()).map(String).sort()
}
