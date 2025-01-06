import { TextWrapper } from '@/components/common/TextWrapper'
import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { HeaderWrapper } from './utils/HeaderWrapper'

export const addressColumn: ColumnDef<SearchResult> = {
  id: 'formattedAddress',
  accessorKey: 'formattedAddress',
  meta: {
    filterVariant: 'text',
  },
  header: ({ column }) => <HeaderWrapper column={column} title="Address" />,
  enableSorting: false,
  cell: ({ row }) => {
    const address = row.original.formattedAddress
    if (!address) return null

    return <TextWrapper copyValue={address}>{address}</TextWrapper>
  },
}
