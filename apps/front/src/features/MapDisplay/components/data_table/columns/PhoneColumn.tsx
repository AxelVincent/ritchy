import { TextWrapper } from '@/components/common/TextWrapper'
import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { HeaderWrapper } from './utils/HeaderWrapper'

export const phoneColumn: ColumnDef<SearchResult> = {
  id: 'internationalPhoneNumber',
  accessorKey: 'internationalPhoneNumber',
  meta: {
    filterVariant: 'text',
  },
  header: ({ column }) => <HeaderWrapper column={column} title="Phone" />,
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
