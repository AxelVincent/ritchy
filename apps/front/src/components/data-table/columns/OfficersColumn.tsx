import { useMapStore } from '@/components/map-display/store/useMapStore'
import type { CompanyOfficer, SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { CopyButton } from './utils/ColumnCells'
import { HeaderWrapper } from './utils/HeaderWrapper'

const formatOfficerName = (officer: CompanyOfficer): string => {
  const firstName = officer.firstName?.trim() || ''
  const lastName = officer.lastName?.trim() || ''

  if (firstName && lastName) {
    return `${firstName} ${lastName}`
  }
  if (firstName) return firstName
  if (lastName) return lastName
  return 'Unknown'
}

export const officersColumn: ColumnDef<SearchResult> = {
  id: 'officers',
  size: 250,
  accessorKey: 'companyOfficers',
  meta: {
    filterVariant: 'text',
    isEnrichment: true,
  },
  accessorFn: (row) => {
    const officersSearchString =
      row.companyOfficers
        ?.map((officer) =>
          `${officer.firstName || ''} ${officer.lastName || ''} ${officer.role || ''}`.trim(),
        )
        .join(', ') ?? ''
    return officersSearchString
  },
  header: ({ column }) => <HeaderWrapper column={column} title="Officers" />,
  cell: ({ row }) => {
    const officers = row.original.companyOfficers || []
    const { selectPlaceAndTab } = useMapStore()

    const handleCellClick = () => {
      selectPlaceAndTab(row.original.id, 'contacts')
    }

    if (!officers.length) {
      return (
        <div
          className="w-full h-full flex items-center px-2 cursor-pointer"
          onClick={handleCellClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleCellClick()
            }
          }}
        />
      )
    }

    const firstOfficer = officers[0]
    const firstOfficerName = formatOfficerName(firstOfficer)

    return (
      <div
        className="group/cell relative w-full h-full flex items-center px-2 gap-2 cursor-pointer"
        onClick={handleCellClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleCellClick()
          }
        }}
      >
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="truncate" title={firstOfficerName}>
            {firstOfficerName}
          </span>
          {officers.length > 1 && (
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
              +{officers.length - 1}
            </span>
          )}
        </div>
        <CopyButton valueToCopy={firstOfficerName} ariaLabel="Copy officer" />
      </div>
    )
  },
}
