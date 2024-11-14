import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { useEffect, useRef, useState } from 'react'
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
  types: string[]
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
    id: 'select',
    header: ({ table }) => (
      <div className="flex h-6 w-6 items-center justify-center">
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex h-6 w-6 items-center justify-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false
  },
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
      const textRef = useRef<HTMLDivElement>(null)
      const [isTruncated, setIsTruncated] = useState(false)

      useEffect(() => {
        const element = textRef.current
        if (element) {
          setIsTruncated(element.scrollWidth > element.clientWidth)
        }
      }, [])

      return (
        <div className="text-left max-w-[200px] group relative">
          <div
            ref={textRef}
            className="truncate"
            title={isTruncated ? row.original.displayName : undefined}
          >
            {row.original.displayName}
          </div>
          {isTruncated && (
            <div className="fixed mt-2 hidden rounded-md border bg-background p-2 shadow-md group-hover:flex group-hover:flex-wrap gap-2 max-h-[200px] overflow-y-auto z-[100] min-w-[200px]">
              {row.original.displayName}
            </div>
          )}
        </div>
      )
    }
  },
  {
    accessorKey: 'types',
    header: () => 'Types',
    cell: ({ row }) => {
      const types = row.original.types
      const displayCount = 2
      const remainingCount = types.length - displayCount

      return (
        <div className="flex gap-2 whitespace-nowrap">
          {types.slice(0, displayCount).map((type) => (
            <Badge variant="secondary" key={type} className="shrink-0">
              {type}
            </Badge>
          ))}
          {remainingCount > 0 && (
            <div className="relative group shrink-0">
              <Badge variant="outline">+{remainingCount}</Badge>

              <div className="fixed mt-2 hidden rounded-md border bg-background p-2 shadow-md group-hover:flex group-hover:flex-wrap gap-2 max-h-[200px] overflow-y-auto z-[100] min-w-[200px]">
                {types.slice(displayCount).map((type) => (
                  <Badge variant="secondary" key={type}>
                    {type}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )
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
