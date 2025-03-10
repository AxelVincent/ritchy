import { TextWrapper } from '@/components/common/TextWrapper'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import type { Note, SearchResult } from '@ritchy/types'
import type { Row, Table } from '@tanstack/react-table'
import React from 'react'
import {
  createColumnPinActions,
  createColumnPinCopyActions,
  createColumnPinNoteActions,
} from './createColumnActions'

import { Notes } from '@/components/notes/Notes'
import { formatDistanceToNow } from 'date-fns'

interface BaseColumnCellProps {
  row: Row<SearchResult>
  table: Table<SearchResult>
  content: React.ReactNode
}

interface ColumnPinCopyCellProps extends BaseColumnCellProps {
  content: string | null
  href?: string
}

export interface NotesColumnCellProps {
  row: Row<SearchResult>
  table: Table<SearchResult>
  place: SearchResult
  content: Note | null
}

// For columns that need both pin and copy actions
export const ColumnPinCopyCell = React.memo(function ColumnPinCopyCell({
  row,
  content,
  href,
}: ColumnPinCopyCellProps) {
  const actions = React.useMemo(
    () => createColumnPinCopyActions(row.original.id, content),
    [row.original.id, content],
  )

  const displayContent = href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 hover:text-blue-800 hover:underline"
      onClick={(e) => e.stopPropagation()}
    >
      {content}
    </a>
  ) : (
    content
  )

  return (
    <TextWrapper id={row.original.id} actions={actions}>
      {displayContent}
    </TextWrapper>
  )
})

// For columns that only need pin action
export const ColumnPinCell = React.memo(function ColumnPinCell({
  row,
  content,
}: BaseColumnCellProps) {
  const actions = React.useMemo(
    () => createColumnPinActions(row.original.id),
    [row.original.id],
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
  const actions = createColumnPinNoteActions(row.original.id, () => {
    const dialogTrigger = document.querySelector(
      `[data-notes-dialog-trigger="${row.original.id}"]`,
    ) as HTMLButtonElement
    dialogTrigger?.click()
  })

  const [notes, setNotes] = React.useState(place.notes || [])

  React.useEffect(() => {
    setNotes(place.notes || [])
  }, [place.notes])

  // Function to handle adding a new note
  const handleNoteAdded = (note: Note) => {
    // Update local state immediately
    const updatedNotes = [note, ...notes]
    setNotes(updatedNotes)

    // Update the original data object to maintain consistency
    // This ensures that if the component re-renders, it will have the updated notes
    place.notes = updatedNotes
  }

  const handleClick = () => {
    const dialogTrigger = document.querySelector(
      `[data-notes-dialog-trigger="${row.original.id}"]`,
    ) as HTMLButtonElement
    dialogTrigger?.click()
  }

  return (
    <TextWrapper id={row.original.id} actions={actions}>
      <Dialog modal={false}>
        <div
          className="group flex items-center w-full cursor-pointer min-h-[24px]"
          onClick={handleClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleClick()
            }
          }}
          aria-label="Open notes"
        >
          <span className="text-muted-foreground text-sm truncate">
            {notes[0]
              ? formatDistanceToNow(new Date(notes[0].createdAt), {
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
            <Notes placeId={place.id} onNoteAdded={handleNoteAdded} />
          </div>
        </DialogContent>
      </Dialog>
    </TextWrapper>
  )
})
