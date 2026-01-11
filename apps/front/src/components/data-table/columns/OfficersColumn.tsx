import { Badge } from '@/components/ui/badge'
import type { PlaceContact, SearchResult } from '@api/shared'
import type { ColumnDef } from '@tanstack/react-table'
import { ClickableCell } from './utils/ClickableCell'
import { CopyButton } from './utils/ColumnCells'
import { HeaderWrapper } from './utils/HeaderWrapper'

const formatContactName = (contact: PlaceContact): string => {
  const firstName = contact.firstName?.trim() || ''
  const lastName = contact.lastName?.trim() || ''

  if (firstName && lastName) {
    return `${firstName} ${lastName}`
  }
  if (firstName) return firstName
  if (lastName) return lastName
  return 'Unknown'
}

export const contactsColumn: ColumnDef<SearchResult> = {
  id: 'contacts',
  size: 250,
  accessorKey: 'placeContacts',
  meta: {
    filterVariant: 'text',
    isEnrichment: true,
  },
  accessorFn: (row) => {
    const contactsSearchString =
      row.placeContacts
        ?.map((contact) =>
          `${contact.firstName || ''} ${contact.lastName || ''} ${contact.role || ''}`.trim(),
        )
        .join(', ') ?? ''
    return contactsSearchString
  },
  header: ({ column }) => <HeaderWrapper column={column} title="Contacts" />,
  cell: ({ row }) => {
    const contacts = row.original.placeContacts || []

    if (!contacts.length) {
      return (
        <ClickableCell placeId={row.original.id} tab="contacts">
          {null}
        </ClickableCell>
      )
    }

    const firstContact = contacts[0]
    const firstContactName = formatContactName(firstContact)

    return (
      <ClickableCell
        placeId={row.original.id}
        tab="contacts"
        className="group/cell relative gap-2"
      >
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="truncate" title={firstContactName}>
            {firstContactName}
          </span>
          {contacts.length > 1 && (
            <Badge variant="secondary">+{contacts.length - 1}</Badge>
          )}
        </div>
        <CopyButton valueToCopy={firstContactName} ariaLabel="Copy contact" />
      </ClickableCell>
    )
  },
}
