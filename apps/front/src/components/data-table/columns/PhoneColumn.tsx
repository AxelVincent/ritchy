import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { ClickableCell } from './utils/ClickableCell'
import { CopyCell } from './utils/ColumnCells'
import { HeaderWrapper } from './utils/HeaderWrapper'

export const phoneColumn: ColumnDef<SearchResult> = {
  id: 'phone',
  accessorKey: 'phone',
  size: 200,
  meta: {
    filterVariant: 'text',
  },
  header: ({ column }) => <HeaderWrapper column={column} title="Phone" />,
  cell: ({ row }) => {
    const phone = row.getValue('phone') as string

    return (
      <ClickableCell placeId={row.original.id} tab="contacts" className="p-0">
        {phone && <CopyCell content={phone} href={`tel:${phone}`} />}
      </ClickableCell>
    )
  },
}
