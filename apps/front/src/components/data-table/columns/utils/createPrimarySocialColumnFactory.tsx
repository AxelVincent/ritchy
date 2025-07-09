import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { ColumnPinCell, ColumnPinCopyCell } from './ColumnCells'
import { HeaderWrapper } from './HeaderWrapper'

// Factory function to create a standardized column definition
export const createPrimarySocialColumn = (
  socialName: string,
): ColumnDef<SearchResult> => {
  const capitalizedName =
    socialName.charAt(0).toUpperCase() + socialName.slice(1)

  return {
    id: `primary${capitalizedName}`,
    accessorKey: `primary${capitalizedName}Social`,
    size: 200,
    meta: {
      filterVariant: 'text',
    },
    header: ({ column }) => (
      <HeaderWrapper column={column} title={`Primary ${capitalizedName}`} />
    ),
    cell: ({ row }) => {
      const socialField =
        `primary${capitalizedName}Social` as keyof SearchResult
      const primarySocial =
        socialField in row.original ? row.original[socialField] : null

      return primarySocial ? (
        <ColumnPinCopyCell
          id={row.original.id}
          content={primarySocial as string}
          href={primarySocial as string}
        />
      ) : (
        <ColumnPinCell
          id={row.original.id}
          content={
            <span className="text-muted-foreground text-sm">
              No primary {capitalizedName}
            </span>
          }
        />
      )
    },
  }
}
