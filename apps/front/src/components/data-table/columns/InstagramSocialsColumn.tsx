import { getCleanUrlDisplay } from '@/lib/utils/url-utils'
import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { ClickableCell } from './utils/ClickableCell'
import { SimpleArrayCell } from './utils/ColumnCells'
import { HeaderWrapper } from './utils/HeaderWrapper'

export const instagramSocialsColumn: ColumnDef<SearchResult> = {
  id: 'instagramSocials',
  size: 300,
  accessorKey: 'instagramSocials',
  meta: {
    filterVariant: 'text',
    isEnrichment: true,
  },
  accessorFn: (row) => {
    const socialSearchString =
      row.contactInstagrams?.map((social) => social.url).join(', ') ?? ''
    return socialSearchString
  },
  header: ({ column }) => <HeaderWrapper column={column} title="Instagram" />,
  cell: ({ row }) => {
    const instagramUrls =
      row.original.contactInstagrams?.map((s) => s.url) || []

    return (
      <ClickableCell placeId={row.original.id} tab="contacts" className="p-0">
        <SimpleArrayCell
          items={instagramUrls}
          itemLabel="more"
          href={(url) => url}
          formatDisplay={getCleanUrlDisplay}
        />
      </ClickableCell>
    )
  },
}
