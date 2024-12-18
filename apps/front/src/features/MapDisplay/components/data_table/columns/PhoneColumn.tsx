import { TextWrapper } from '@/components/common/TextWrapper'
import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'

export const phoneColumn: ColumnDef<SearchResult> = {
  id: 'internationalPhoneNumber',
  accessorKey: 'internationalPhoneNumber',
  header: () => <TextWrapper>Phone</TextWrapper>,
  cell: ({ row }) => {
    const phone = row.getValue('internationalPhoneNumber') as string
    if (!phone) return <TextWrapper>-</TextWrapper>

    return (
      <TextWrapper copyValue={phone}>
        <span>{phone}</span>
      </TextWrapper>
    )
  },
}
