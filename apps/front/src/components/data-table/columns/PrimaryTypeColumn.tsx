import { Badge } from '@/components/ui/badge'
import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { ColumnPinCell } from './utils/ColumnCells'
import { HeaderWrapper } from './utils/HeaderWrapper'

export const primaryTypeColumn: ColumnDef<SearchResult> = {
  id: 'primaryType',
  accessorKey: 'primaryType',
  size: 200,
  meta: {
    filterVariant: 'multi-select',
  },
  header: () => <HeaderWrapper title="Primary Type" />,
  cell: ({ row }) => (
    <ColumnPinCell
      id={row.original.id}
      content={
        row.original.primaryType && (
          <Badge variant="secondary">{row.original.primaryType}</Badge>
        )
      }
    />
  ),
}
