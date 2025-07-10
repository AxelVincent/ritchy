import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useState } from 'react'
import { SecondarySocialsList } from './SecondarySocialsList'

interface SecondarySocialDialogProps {
  socialsArray: string[]
  capitalizedName: string
  placeName: string
  placeId: string
  socialName: string
  children: React.ReactNode
}

export const SecondarySocialDialog = ({
  socialsArray,
  capitalizedName,
  placeName,
  placeId,
  socialName,
  children,
}: SecondarySocialDialogProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

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
        aria-label={`Open secondary ${socialName.toLowerCase()} links for ${placeName}`}
      >
        {children}
      </div>
      <DialogContent className="max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {placeName}'s Secondary {capitalizedName} Links
          </DialogTitle>
        </DialogHeader>
        <SecondarySocialsList links={socialsArray} id={placeId} />
      </DialogContent>
    </Dialog>
  )
}
