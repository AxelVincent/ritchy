import { useMapStore } from '@/components/map-display/store/useMapStore'
import { getCleanUrlDisplay } from '@/lib/utils/url-utils'
import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { SimpleArrayCell } from './utils/ColumnCells'
import { HeaderWrapper } from './utils/HeaderWrapper'

export const linkedinSocialsColumn: ColumnDef<SearchResult> = {
  id: 'linkedinSocials',
  size: 300,
  accessorKey: 'linkedinSocials',
  meta: {
    filterVariant: 'text',
    isEnrichment: true,
  },
  accessorFn: (row) => {
    const socialSearchString =
      row.contactLinkedins?.map((social) => social.url).join(', ') ?? ''
    return socialSearchString
  },
  header: ({ column }) => <HeaderWrapper column={column} title="LinkedIn" />,
  cell: ({ row }) => {
    const linkedinUrls = row.original.contactLinkedins?.map((s) => s.url) || []
    const { selectPlaceAndTab } = useMapStore()

    return (
      <SimpleArrayCell
        items={linkedinUrls}
        itemLabel="more"
        href={(url) => url}
        formatDisplay={getCleanUrlDisplay}
        onClick={() => selectPlaceAndTab(row.original.id, 'contact')}
      />
    )
  },
}
