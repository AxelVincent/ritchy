import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { ColumnPinCell, ColumnPinCopyCell } from './ColumnCells'
import { HeaderWrapper } from './HeaderWrapper'
import { SecondarySocialDialog } from './SecondarySocialDialog'
/**
 * Factory function to create secondary social media columns for the data table.
 *
 * This pattern is used to avoid code duplication across similar social media columns.
 * Each column follows the same behavior: show first link, badge for additional links,
 * and dialog for viewing all links.
 *
 * @param socialName - The social platform name (e.g., 'facebook', 'linkedin')
 * @returns A configured ColumnDef for the specified social platform
 *
 * @example
 * ```typescript
 * // Create columns for different platforms
 * const facebookColumn = createSecondarySocialColumn('facebook')
 * const linkedinColumn = createSecondarySocialColumn('linkedin')
 *
 * // Usage in columns array
 * export const columns: ColumnDef<SearchResult>[] = [
 *   facebookColumn,
 *   linkedinColumn,
 *   // ... other columns
 * ]
 * ```
 *
 * @remarks
 * - Field access: Uses `secondary${capitalizedName}Socials` (e.g., 'secondaryFacebookSocials')
 * - Behavior: Matches secondary emails pattern (first item + badge + dialog)
 * - Type safety: Assumes SearchResult has corresponding field names
 *
 * @see SecondaryEmailsColumn for the pattern this follows
 */
export const createSecondarySocialColumn = (
  socialName: string,
): ColumnDef<SearchResult> => {
  const capitalizedName =
    socialName.charAt(0).toUpperCase() + socialName.slice(1)

  return {
    id: `secondary${capitalizedName}`,
    accessorKey: `secondary${capitalizedName}Social`,
    size: 300,
    meta: {
      filterVariant: 'text',
    },
    header: ({ column }) => (
      <HeaderWrapper column={column} title={`Secondary ${capitalizedName}`} />
    ),
    cell: ({ row }) => {
      const socialField =
        `secondary${capitalizedName}Socials` as keyof SearchResult
      const secondarySocials =
        socialField in row.original ? row.original[socialField] : []

      if (!Array.isArray(secondarySocials) || secondarySocials.length === 0) {
        return (
          <ColumnPinCell
            id={row.original.id}
            content={
              <span className="text-muted-foreground text-sm">
                No secondary {capitalizedName} links
              </span>
            }
          />
        )
      }

      const socialsArray = secondarySocials as string[]
      // Single social
      if (socialsArray.length === 1) {
        return (
          <ColumnPinCopyCell
            id={row.original.id}
            content={socialsArray[0]}
            href={socialsArray[0]}
          />
        )
      }

      // Multiple socials: show first social + badge with count
      return (
        <SecondarySocialDialog
          socialsArray={socialsArray}
          capitalizedName={capitalizedName}
          placeName={row.original.name}
          placeId={row.original.id}
          socialName={socialName}
        >
          <div className="flex items-center w-full">
            <div className="flex-1 min-w-0">
              <ColumnPinCopyCell
                id={row.original.id}
                content={socialsArray[0]}
                href={socialsArray[0]}
              />
            </div>
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full mr-1 whitespace-nowrap ml-1.5 shrink-0">
              +{socialsArray.length - 1} more
            </span>
          </div>
        </SecondarySocialDialog>
      )
    },
  }
}
