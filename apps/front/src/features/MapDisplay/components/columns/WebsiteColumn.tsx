import type { ColumnDef } from '@tanstack/react-table'
import { ExternalLink } from 'lucide-react'
import { TextWrapper } from '../../../../components/common/TextWrapper'
import type { SearchResult } from '../Columns'

export const websiteColumn: ColumnDef<SearchResult> = {
  id: 'websiteUri',
  accessorKey: 'websiteUri',
  header: () => <TextWrapper>Website</TextWrapper>,
  cell: ({ row }) => {
    const website = row.getValue('websiteUri') as string
    if (!website) return <TextWrapper>-</TextWrapper>

    return (
      <TextWrapper copyValue={website}>
        <a
          href={website}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1"
        >
          <span className="truncate max-w-[200px]">{website}</span>
          <ExternalLink className="h-4 w-4" />
        </a>
      </TextWrapper>
    )
  },
}
