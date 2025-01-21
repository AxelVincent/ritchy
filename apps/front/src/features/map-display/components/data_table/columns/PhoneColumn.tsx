import { TextWrapper } from '@/components/common/TextWrapper'
import { toast } from '@/hooks/use-toast'
import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { HeaderWrapper } from './utils/HeaderWrapper'

export const phoneColumn: ColumnDef<SearchResult> = {
  id: 'internationalPhoneNumber',
  accessorKey: 'internationalPhoneNumber',
  size: 150,
  meta: {
    filterVariant: 'text',
  },
  header: ({ column }) => <HeaderWrapper column={column} title="Phone" />,
  cell: ({ row, table }) => {
    const phone = row.getValue('internationalPhoneNumber') as string
    return (
      <TextWrapper
        id={row.original.id}
        actions={[
          {
            icon: 'MapPinned',
            onClick: () => {
              table.options.meta?.setSelectedPlaceId?.(row.original.id)
            },
            label: 'Pin to map',
          },
          {
            icon: 'Copy',
            onClick: () => {
              navigator.clipboard.writeText(phone)
              toast({
                title: phone,
                description: 'Copied to clipboard',
              })
            },
            label: 'Copy',
          },
        ]}
      >
        {phone}
      </TextWrapper>
    )
  },
}
