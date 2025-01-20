import { TextWrapper } from '@/components/common/TextWrapper'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Notes } from '@/features/places/Notes'
import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { formatDistanceToNow } from 'date-fns'
import { MessageSquareText } from 'lucide-react'
import React from 'react'
import { HeaderWrapper } from './utils/HeaderWrapper'

export const notesColumn: ColumnDef<SearchResult> = {
  id: 'notes',
  accessorKey: 'notes',
  size: 150,
  enableColumnFilter: false,
  header: ({ column }) => <HeaderWrapper column={column} title="Notes" />,
  cell: ({ row }) => {
    const place = row.original
    const [notes, setNotes] = React.useState(place.notes || [])

    React.useEffect(() => {
      setNotes(place.notes || [])
    }, [place.notes])

    const lastNote = notes.length > 0 ? notes[0] : null

    return (
      <TextWrapper showTooltip={false}>
        <Dialog modal={false}>
          <div className="group flex items-center w-full">
            <span className="text-muted-foreground text-sm truncate">
              {lastNote
                ? formatDistanceToNow(new Date(lastNote.created_at), {
                    addSuffix: true,
                  })
                : ''}
            </span>
            <div className="flex-1" />
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity relative ml-2"
                title="Add note"
              >
                <MessageSquareText className="h-4 w-4" />
              </Button>
            </DialogTrigger>
          </div>
          <DialogContent
            className="max-w-md h-[60vh] flex flex-col overflow-hidden"
            onPointerDownOutside={(e) => e.preventDefault()}
            onInteractOutside={(e) => e.preventDefault()}
            onOpenAutoFocus={(e) => e.preventDefault()}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex-1 overflow-hidden"
              onKeyDown={(e) => e.stopPropagation()}
            >
              <Notes
                placeId={place.id}
                onNoteAdded={(note) => {
                  // Update local state immutably
                  setNotes([note, ...notes])
                  // Update the original data immutably
                  place.notes = [note, ...notes]
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      </TextWrapper>
    )
  },
}
