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
  meta: {
    filterVariant: 'text',
  },
  header: ({ column }) => <HeaderWrapper column={column} title="Website" />,
  cell: ({ row }) => {
    const website = row.getValue('websiteUri') as string
    if (!website) return <TextWrapper>-</TextWrapper>

    return (
      <div className="flex items-center gap-1">
        <TextWrapper copyValue={website}>
          <a href={website} target="_blank" rel="noopener noreferrer">
            {getDomainFromUrl(website)}
          </a>
        </TextWrapper>
      </div>
    )
  },
}
