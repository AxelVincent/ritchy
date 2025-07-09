import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { useState } from 'react'
import { ColumnPinCell, ColumnPinCopyCell } from './ColumnCells'
import { HeaderWrapper } from './HeaderWrapper'
import { SecondarySocialsList } from './SecondarySocialsList'
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
      const socialField = `secondary${capitalizedName}Socials`
      const secondarySocials = row.original[socialField as keyof SearchResult]
      const [isDialogOpen, setIsDialogOpen] = useState(false)

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
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <div
            className="group flex items-center w-full cursor-pointer min-h-[24px]"
            onClick={() => setIsDialogOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                setIsDialogOpen(true)
              }
            }}
            aria-label={`Open secondary ${socialName.toLowerCase()} links`}
          >
            <ColumnPinCopyCell
              id={row.original.id}
              content={socialsArray[0]}
              href={socialsArray[0]}
            />
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full whitespace-nowrap ml-1.5 mr-1.5">
              +{socialsArray.length - 1} more
            </span>
            <div className="flex-1" />
          </div>
          <DialogContent className="max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {row.original.name}'s Secondary {capitalizedName} Links
              </DialogTitle>
            </DialogHeader>
            <SecondarySocialsList
              links={socialsArray}
              platform={socialName.toLowerCase()}
              id={row.original.id}
            />
          </DialogContent>
        </Dialog>
      )
    },
  }
}
