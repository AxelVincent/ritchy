import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { ColumnPinCopyCell } from './utils/ColumnCells'
import { HeaderWrapper } from './utils/HeaderWrapper'

export const shortDescriptionColumn: ColumnDef<SearchResult> = {
  id: 'shortDescription',
  accessorKey: 'shortDescription',
  header: ({ column }) => (
    <HeaderWrapper column={column} title="Short Description" />
  ),
  meta: {
    filterVariant: 'text',
    isEnrichment: true,
  },
  cell: ({ row }) => {
    const shortDescription = row.original.shortDescription
    if (!shortDescription) return null

    return <ColumnPinCopyCell id={row.original.id} content={shortDescription} />
  },
}
