import { TextWrapper } from '@/components/common/TextWrapper'
import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { HeaderWrapper } from './utils/HeaderWrapper'

const getDomainFromUrl = (url: string): string => {
  try {
    const domain = new URL(url).hostname.replace('www.', '')
    return domain
  } catch {
    return url
  }
}

export const websiteColumn: ColumnDef<SearchResult> = {
  id: 'websiteUri',
  accessorKey: 'websiteUri',
  size: 200,
  meta: {
    filterVariant: 'text',
  },
  header: ({ column }) => <HeaderWrapper column={column} title="Website" />,
  cell: ({ row, table }) => {
    const website = row.getValue('websiteUri') as string
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
            },
            label: 'Copy',
          },
        ]}
      >
        {website ? (
          <a href={website} target="_blank" rel="noopener noreferrer">
            {getDomainFromUrl(website)}
          </a>
        ) : (
          '-'
        )}
      </TextWrapper>
    )
  },
}
