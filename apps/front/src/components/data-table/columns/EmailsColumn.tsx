import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { ClickableCell } from './utils/ClickableCell'
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
      <ClickableCell placeId={row.original.id} tab="contacts" className="p-0">
        <SimpleArrayCell
          items={emails}
          itemLabel="more"
          href={(email) => `mailto:${email}`}
          getBadge={getBadge}
        />
      </ClickableCell>
    )
  },
}
