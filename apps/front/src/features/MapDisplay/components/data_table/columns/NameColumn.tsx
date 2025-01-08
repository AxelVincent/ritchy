import { TextWrapper } from '@/components/common/TextWrapper'
import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { HeaderWrapper } from './utils/HeaderWrapper'

export const nameColumn: ColumnDef<SearchResult> = {
  id: 'displayName',
  accessorKey: 'displayName',
  meta: {
    filterVariant: 'text',
  },
  header: ({ column }) => {
    return <HeaderWrapper column={column} title="Name" />
  },
  cell: ({ row }) => {
    return (
      <TextWrapper truncate={true} width="200px">
        {row.original.displayName}
      </TextWrapper>
    )
  },
}
