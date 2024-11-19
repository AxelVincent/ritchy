import type { ColumnDef } from '@tanstack/react-table'
import { Phone } from 'lucide-react'
import type { SearchResult } from '../Columns'
import { CellWrapper } from './CellWrapper'

export const phoneColumn: ColumnDef<SearchResult> = {
  accessorKey: 'internationalPhoneNumber',
  header: 'Phone',
  cell: ({ row }) => {
    const phone = row.getValue('internationalPhoneNumber') as string
    if (!phone) return <CellWrapper>-</CellWrapper>

    return (
      <CellWrapper copyValue={phone}>
        <a href={`tel:${phone}`} className="flex items-center gap-1">
          <Phone className="h-4 w-4" />
          <span>{phone}</span>
        </a>
      </CellWrapper>
    )
  }
}
