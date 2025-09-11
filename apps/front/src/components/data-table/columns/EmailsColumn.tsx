import { useMapStore } from '@/components/map-display/store/useMapStore'
import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { ContactEmailCell } from './utils/ColumnCells'
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
    const emails = row.original.contactEmails || []
    const { selectPlaceAndTab } = useMapStore()

    const handleClick = () => {
      selectPlaceAndTab(row.original.id, 'contact')
    }

    return (
      <ContactEmailCell
        id={row.original.id}
        emails={emails}
        onClick={handleClick}
      />
    )
  },
}
