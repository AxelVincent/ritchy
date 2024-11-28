import type { ColumnDef } from '@tanstack/react-table'
import type { SearchResult } from '../Columns'
import { CellWrapper } from './CellWrapper'

export const addressColumn: ColumnDef<SearchResult> = {
  accessorKey: 'address',
  header: () => <CellWrapper>Address</CellWrapper>,
  enableSorting: false,
  cell: ({ row }) => {
    const address = row.original.formattedAddress
    if (!address) return null

    return <CellWrapper copyValue={address}>{address}</CellWrapper>
  }
}
