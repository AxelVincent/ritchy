import { TextWrapper } from '@/components/common/TextWrapper'
import { toast } from '@/hooks/use-toast'
import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { HeaderWrapper } from './utils/HeaderWrapper'

export const descriptionColumn: ColumnDef<SearchResult> = {
  id: 'description',
  accessorKey: 'description',
  size: 250,
  meta: {
    filterVariant: 'text',
  },
  header: ({ column }) => {
    return <HeaderWrapper column={column} title="Description" width="250px" />
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
              navigator.clipboard.writeText(
                row.original.editorialSummary?.text ?? '',
              )
              toast({
                title: row.original.editorialSummary?.text ?? '',
                description: 'Copied to clipboard',
              })
            },
            label: 'Copy',
          },
        ]}
      >
        {row.original.editorialSummary?.text ?? ''}
      </TextWrapper>
    )
  },
}
