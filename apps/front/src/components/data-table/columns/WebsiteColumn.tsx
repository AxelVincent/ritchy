import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { ColumnPinCopyCell } from './utils/ColumnCells'
import { HeaderWrapper } from './utils/HeaderWrapper'

export const websiteColumn: ColumnDef<SearchResult> = {
  id: 'website',
  accessorKey: 'website',
  size: 200,
  meta: {
    filterVariant: 'text',
  },
  header: ({ column }) => <HeaderWrapper column={column} title="Website" />,
  cell: ({ row }) => {
    const website = row.getValue('website') as string
    return (
      <ColumnPinCopyCell
        id={row.original.id}
        content={website || ''}
        href={website}
      />
    )
  },
}
