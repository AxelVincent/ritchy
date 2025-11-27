import { getCleanUrlDisplay } from '@/lib/utils/url-utils'
import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { ClickableCell } from './utils/ClickableCell'
import { SimpleArrayCell } from './utils/ColumnCells'
import { HeaderWrapper } from './utils/HeaderWrapper'

export const facebookSocialsColumn: ColumnDef<SearchResult> = {
  id: 'facebookSocials',
  size: 300,
  accessorKey: 'facebookSocials',
  meta: {
    filterVariant: 'text',
    isEnrichment: true,
  },
  accessorFn: (row) => {
    const socialSearchString =
      row.contactFacebooks?.map((social) => social.url).join(', ') ?? ''
    return socialSearchString
  },
  header: ({ column }) => <HeaderWrapper column={column} title="Facebook" />,
  cell: ({ row }) => {
    const facebookUrls = row.original.contactFacebooks?.map((s) => s.url) || []

    return (
      <ClickableCell placeId={row.original.id} tab="contacts" className="p-0">
        <SimpleArrayCell
          items={facebookUrls}
          itemLabel="more"
          href={(url) => url}
          formatDisplay={getCleanUrlDisplay}
        />
      </ClickableCell>
    )
  },
}
