import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { useState } from 'react'
import { ColumnPinCell, ContactSocialCell } from './utils/ColumnCells'
import { HeaderWrapper } from './utils/HeaderWrapper'
import { SocialMediaList } from './utils/SocialMediaList'

export const instagramSocialsColumn: ColumnDef<SearchResult> = {
  id: 'instagramSocials',
  size: 300,
  accessorKey: 'instagramSocials',
  meta: {
    filterVariant: 'text',
    isEnrichment: true,
  },
  accessorFn: (row) => {
    const socialSearchString =
      row.instagramSocials?.map((social) => social.url).join(', ') ?? ''
    return socialSearchString
  },
  header: ({ column }) => <HeaderWrapper column={column} title="Instagram" />,
  cell: ({ row }) => {
    const instagramSocials = row.original.instagramSocials
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    if (!instagramSocials?.length) {
      return <ColumnPinCell id={row.original.id} content={null} />
    }

    if (instagramSocials.length === 1) {
      return (
        <ContactSocialCell
          id={row.original.id}
          content={instagramSocials[0].url}
          socialType="INSTAGRAM"
        />
      )
    }

    return (
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <div
          className="group flex items-center w-full pr-2 cursor-pointer min-h-[24px]"
          onClick={() => setIsDialogOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setIsDialogOpen(true)
            }
          }}
          aria-label="Open Instagram profiles"
        >
          <div className="min-w-0 flex-1">
            <ContactSocialCell
              id={row.original.id}
              content={instagramSocials[0].url}
              socialType="INSTAGRAM"
              isPin={true}
            />
          </div>
          <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full whitespace-nowrap ml-1.5 flex-shrink-0">
            +{instagramSocials.length - 1} more
          </span>
        </div>
        <DialogContent className="max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{row.original.name}'s Instagram Profiles</DialogTitle>
          </DialogHeader>
          <SocialMediaList socials={instagramSocials} id={row.original.id} />
        </DialogContent>
      </Dialog>
    )
  },
}
