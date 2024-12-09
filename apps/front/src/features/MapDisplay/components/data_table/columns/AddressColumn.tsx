import { TextWrapper } from '@/components/common/TextWrapper'
import type { ColumnDef } from '@tanstack/react-table'
import type { SearchResult } from '../Columns'

export const addressColumn: ColumnDef<SearchResult> = {
  id: 'formattedAddress',
  accessorKey: 'formattedAddress',
  header: () => <TextWrapper>Address</TextWrapper>,
  enableSorting: false,
  cell: ({ row }) => {
    const address = row.original.formattedAddress
    if (!address) return null

    return <TextWrapper copyValue={address}>{address}</TextWrapper>
  },
}
