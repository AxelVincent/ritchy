import { TextWrapper } from '@/components/common/TextWrapper'
import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { HeaderWrapper } from './utils/HeaderWrapper'

export const nameColumn: ColumnDef<SearchResult> = {
  id: 'displayName',
  accessorKey: 'displayName',
  size: 200,
  meta: {
    filterVariant: 'text',
  },
  header: ({ column }) => {
    return <HeaderWrapper column={column} title="Name" width="200px" />
  },
  cell: ({ row }) => {
    return (
      <TextWrapper
        copyValue={row.original.displayName}
        truncate={true}
        width="200px"
      >
        {row.original.displayName}
      </TextWrapper>
    )
  },
}
