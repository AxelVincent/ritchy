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
import { ArrowUpDown, Link, MoreHorizontal } from 'lucide-react'

// 1. Nom
// 2. Phone
// 3. Email
// 4. Website
// 5. Social Media (Insta, Linkedin)
// 6. Nom du proriétaire (dispo sur Scrape IO)
// 7. Avis
// 8. Description en 1 phrase  (bonus)

export type SearchResult = {
  id: string
  displayName: string
  websiteUri: string
  //   types: string[]
  //   formattedAddress: string
  //   nationalPhoneNumber: string
  //   internationalPhoneNumber: string
  googleMapsUri: string
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
      return (
        <div className="text-left">
          <Link href={row.original.websiteUri}>{row.original.websiteUri}</Link>
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
