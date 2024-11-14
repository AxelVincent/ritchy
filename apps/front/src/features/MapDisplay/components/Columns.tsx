import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import type { ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown, ExternalLink, MoreHorizontal } from 'lucide-react'

// 1. Nom - done
// 2. Phone
// 3. Email
// 4. Website - done
// 5. Social Media (Insta, Linkedin)
// 6. Nom du proriétaire (dispo sur Scrape IO)
// 7. Avis
// 8. Description en 1 phrase  (bonus)

export type SearchResult = {
  id: string
  displayName: string
  websiteUri: string
  googleMapsUri: string
  //   types: string[]
  //   formattedAddress: string
  //   nationalPhoneNumber: string
  //   internationalPhoneNumber: string
  //   rating: number
  //   userRatingCount: number
  //   description: string
  //   priceLevel: number
}

export const columns: ColumnDef<SearchResult>[] = [
  {
    accessorKey: 'displayName',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      return <div className="text-left">{row.original.displayName}</div>
    }
  },
  {
    accessorKey: 'websiteUri',
    header: () => 'Website',
    cell: ({ row }) => {
      const website = row.original.websiteUri
      return (
        <div className="text-left">
          <a
            href={website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:underline"
          >
            website
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      )
    }
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const place = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(place.id)}
            >
              Copy place ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                window.open(place.googleMapsUri, '_blank')
              }}
            >
              View on Maps
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  }
]
