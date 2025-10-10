import { useMapStore } from '@/components/map-display/store/useMapStore'
import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { type BadgeConfig, SimpleArrayCell } from './utils/ColumnCells'
import { HeaderWrapper } from './utils/HeaderWrapper'

export const emailsColumn: ColumnDef<SearchResult> = {
  id: 'emails',
  size: 300,
  accessorKey: 'emails',
  meta: {
    filterVariant: 'text',
    isEnrichment: true,
  },
  accessorFn: (row) => {
    const emailSearchString =
      row.contactEmails?.map((email) => email.email).join(', ') ?? ''
    return emailSearchString
  },
  header: ({ column }) => <HeaderWrapper column={column} title="Emails" />,
  cell: ({ row }) => {
    const emails = row.original.contactEmails?.map((e) => e.email) || []
    const { selectPlaceAndTab } = useMapStore()

    const getBadge = (email: string): BadgeConfig => {
      const emailObj = row.original.contactEmails?.find(
        (e) => e.email === email,
      )
      const quality = emailObj?.quality

      if (!quality || quality === 'unknown') return null

      const colorMap = {
        good: 'green' as const,
        risky: 'yellow' as const,
        bad: 'red' as const,
      }

      return {
        text: quality,
        color: colorMap[quality],
      }
    }

    return (
      <SimpleArrayCell
        items={emails}
        itemLabel="more"
        href={(email) => `mailto:${email}`}
        onClick={() => selectPlaceAndTab(row.original.id, 'contact')}
        getBadge={getBadge}
      />
    )
  },
}
