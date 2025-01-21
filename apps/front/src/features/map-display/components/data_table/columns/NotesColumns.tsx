import { TextWrapper } from '@/components/common/TextWrapper'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Notes } from '@/features/places/Notes'
import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { formatDistanceToNow } from 'date-fns'
import React from 'react'
import { HeaderWrapper } from './utils/HeaderWrapper'

export const notesColumn: ColumnDef<SearchResult> = {
  id: 'notes',
  accessorKey: 'notes',
  size: 150,
  enableColumnFilter: false,
  header: ({ column }) => <HeaderWrapper column={column} title="Notes" />,
  cell: ({ row, table }) => {
    const place = row.original
    const [notes, setNotes] = React.useState(place.notes || [])

    React.useEffect(() => {
      setNotes(place.notes || [])
    }, [place.notes])

    const lastNote = notes.length > 0 ? notes[0] : null

    return (
      <TextWrapper
        id={row.original.id}
        actions={[
          {
            icon: 'MapPinned',
            onClick: () => {
              table.options.meta?.setSelectedPlaceId?.(row.original.id)
            },
            label: 'Pin to map',
          },
          {
            icon: 'MessageSquareText',
            onClick: () => {
              const dialogTrigger = document.querySelector(
                `[data-notes-dialog-trigger="${row.original.id}"]`,
              ) as HTMLButtonElement
              dialogTrigger?.click()
            },
            label: 'Add note',
          },
        ]}
      >
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
              <div
                data-notes-dialog-trigger={row.original.id}
                className="hidden"
              />
            </DialogTrigger>
          </div>
          <DialogContent className="max-w-md h-[60vh] flex flex-col overflow-hidden">
            <div className="flex-1 overflow-hidden">
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
