import { Badge } from '@/components/ui/badge'
import type { SearchResult } from '@api/shared'
import type { ColumnDef } from '@tanstack/react-table'
import { ClickableCell } from './utils/ClickableCell'
import { HeaderWrapper } from './utils/HeaderWrapper'

export const primaryTypeColumn: ColumnDef<SearchResult> = {
  id: 'primaryType',
  accessorKey: 'primaryType',
  size: 200,
  meta: {
    filterVariant: 'multi-select',
  },
  header: ({ column }) => (
    <HeaderWrapper column={column} title="Primary Type" />
  ),
  cell: ({ row }) => {
    return (
      <ClickableCell placeId={row.original.id} tab="details">
        {row.original.primaryType && (
          <Badge variant="secondary">{row.original.primaryType}</Badge>
        )}
      </ClickableCell>
    )
  },
}
