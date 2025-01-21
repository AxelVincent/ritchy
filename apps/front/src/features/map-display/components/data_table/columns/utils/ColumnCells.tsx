import { TextWrapper } from '@/components/common/TextWrapper'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import type { SearchResult } from '@ritchy/types'
import type { Row, Table } from '@tanstack/react-table'
import React from 'react'
import {
  createColumnPinActions,
  createColumnPinCopyActions,
  createColumnPinNoteActions,
} from './createColumnActions'

import { Notes } from '@/features/places/Notes'
import { formatDistanceToNow } from 'date-fns'

interface BaseColumnCellProps {
  row: Row<SearchResult>
  table: Table<SearchResult>
  content: React.ReactNode
}

interface NotesColumnCellProps extends BaseColumnCellProps {
  place: SearchResult
}

// For columns that need both pin and copy actions
export const ColumnPinCopyCell = React.memo(function ColumnPinCopyCell({
  row,
  table,
  content,
}: BaseColumnCellProps) {
  const actions = React.useMemo(
    () =>
      createColumnPinCopyActions(
        row.original.id,
        row.original.displayName,
        table.options.meta?.setSelectedPlaceId,
      ),
    [
      row.original.id,
      row.original.displayName,
      table.options.meta?.setSelectedPlaceId,
    ],
  )

  return (
    <TextWrapper id={row.original.id} actions={actions}>
      {content}
    </TextWrapper>
  )
})

// For columns that only need pin action
export const ColumnPinCell = React.memo(function ColumnPinCell({
  row,
  table,
  content,
}: BaseColumnCellProps) {
  const actions = React.useMemo(
    () =>
      createColumnPinActions(
        row.original.id,
        table.options.meta?.setSelectedPlaceId,
      ),
    [row.original.id, table.options.meta?.setSelectedPlaceId],
  )

  return (
    <TextWrapper id={row.original.id} actions={actions}>
      {content}
    </TextWrapper>
  )
})

// Specialized cell component for notes
export const ColumnPinNoteCell = React.memo(function NotesColumnCell({
  row,
  place,
}: NotesColumnCellProps) {
  const actions = createColumnPinNoteActions(row.original.displayName, () => {
    const dialogTrigger = document.querySelector(
      `[data-notes-dialog-trigger="${row.original.id}"]`,
    ) as HTMLButtonElement
    dialogTrigger?.click()
  })

  const [notes, setNotes] = React.useState(place.notes || [])

  React.useEffect(() => {
    setNotes(place.notes || [])
  }, [place.notes])

  const lastNote = notes.length > 0 ? notes[0] : null

  return (
    <TextWrapper id={row.original.id} actions={actions}>
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
})
