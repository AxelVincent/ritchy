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
  size: 170,
  meta: {
    filterVariant: 'text',
  },
  header: ({ column }) => (
    <HeaderWrapper column={column} title="Website" width="150px" />
  ),
  cell: ({ row }) => {
    const website = row.getValue('websiteUri') as string
    if (!website) return <TextWrapper>-</TextWrapper>

    return (
      <TextWrapper truncate={true}>
        <a href={website} target="_blank" rel="noopener noreferrer">
          {getDomainFromUrl(website)}
        </a>
      </TextWrapper>
    )
  },
}
