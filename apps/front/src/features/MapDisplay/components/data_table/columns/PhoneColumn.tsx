import { TextWrapper } from '@/components/common/TextWrapper'
import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { Phone } from 'lucide-react'

export const phoneColumn: ColumnDef<SearchResult> = {
  id: 'internationalPhoneNumber',
  accessorKey: 'internationalPhoneNumber',
  header: () => <TextWrapper>Phone</TextWrapper>,
  cell: ({ row }) => {
    const phone = row.getValue('internationalPhoneNumber') as string
    if (!phone) return <TextWrapper>-</TextWrapper>

    return (
      <TextWrapper copyValue={phone}>
        <a href={`tel:${phone}`} className="flex items-center gap-1">
          <Phone className="h-4 w-4" />
          <span>{phone}</span>
        </a>
      </TextWrapper>
    )
  },
}
