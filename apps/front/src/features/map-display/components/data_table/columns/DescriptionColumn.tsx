import { TextWrapper } from '@/components/common/TextWrapper'
import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { HeaderWrapper } from './utils/HeaderWrapper'

export const descriptionColumn: ColumnDef<SearchResult> = {
  id: 'description',
  accessorKey: 'description',
  meta: {
    filterVariant: 'text',
  },
  header: ({ column }) => {
    return <HeaderWrapper column={column} title="Description" width="250px" />
  },
  cell: ({ row }) => {
    return (
      <TextWrapper truncate={true} width="250px">
        {row.original.editorialSummary?.text ?? ''}
      </TextWrapper>
    )
  },
}
