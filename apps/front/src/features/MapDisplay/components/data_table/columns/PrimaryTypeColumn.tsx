import { TextWrapper } from '@/components/common/TextWrapper'
import { Badge } from '@/components/ui/badge'
import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { HeaderWrapper } from './utils/HeaderWrapper'

export const primaryTypeColumn: ColumnDef<SearchResult> = {
  id: 'primaryType',
  accessorKey: 'primaryType',
  meta: {
    filterVariant: 'multi-select',
  },
  header: ({ column }) => (
    <HeaderWrapper column={column} title="Primary Type" />
  ),
  cell: ({ row }) => (
    <TextWrapper truncate={true} width="150px">
      {row.original.primaryType && (
        <Badge variant="secondary">{row.original.primaryType}</Badge>
      )}
    </TextWrapper>
  ),
}
