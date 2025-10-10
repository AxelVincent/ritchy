import { useMapStore } from '@/components/map-display/store/useMapStore'
import { getCleanUrlDisplay } from '@/lib/utils/url-utils'
import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
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
    const { selectPlaceAndTab } = useMapStore()

    return (
      <SimpleArrayCell
        items={instagramUrls}
        itemLabel="more"
        href={(url) => url}
        formatDisplay={getCleanUrlDisplay}
        onClick={() => selectPlaceAndTab(row.original.id, 'contact')}
      />
    )
  },
}
