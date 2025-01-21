import { TextWrapper } from '@/components/common/TextWrapper'
import { toast } from '@/hooks/use-toast'
import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { HeaderWrapper } from './utils/HeaderWrapper'

export const nameColumn: ColumnDef<SearchResult> = {
  id: 'displayName',
  accessorKey: 'displayName',
  size: 200,
  meta: {
    filterVariant: 'text',
  },
  header: ({ column }) => {
    return <HeaderWrapper column={column} title="Name" width="200px" />
  },
  cell: ({ row, table }) => {
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
              navigator.clipboard.writeText(row.original.displayName)
              toast({
                title: row.original.displayName,
                description: 'Copied to clipboard',
              })
            },
            label: 'Copy',
          },
        ]}
      >
        {row.original.displayName}
      </TextWrapper>
    )
  },
}
