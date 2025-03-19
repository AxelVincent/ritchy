import { TextWrapper } from '@/components/common/TextWrapper'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import type { Note, SearchResult } from '@ritchy/types'
import React from 'react'
import {
  createColumnPinActions,
  createColumnPinCopyActions,
  createColumnPinNoteActions,
} from './createColumnActions'

import { Notes } from '@/components/notes/Notes'
import { formatDistanceToNow } from 'date-fns'
import posthog from 'posthog-js'

interface BaseColumnCellProps {
  id: string
  content: React.ReactNode
}

interface ColumnPinCopyCellProps extends BaseColumnCellProps {
  content: string | null
  href?: string
}

export interface NotesColumnCellProps {
  id: string
  place: SearchResult
  content: Note | null
}

// For columns that need both pin and copy actions
export const ColumnPinCopyCell = React.memo(function ColumnPinCopyCell({
  id,
  content,
  href,
}: ColumnPinCopyCellProps) {
  const actions = React.useMemo(
    () => createColumnPinCopyActions(id, content),
    [id, content],
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
    <TextWrapper id={id} actions={actions}>
      {displayContent}
    </TextWrapper>
  )
})

// For columns that only need pin action
export const ColumnPinCell = React.memo(function ColumnPinCell({
  id,
  content,
}: BaseColumnCellProps) {
  const actions = React.useMemo(() => createColumnPinActions(id), [id])

  return (
    <TextWrapper id={id} actions={actions}>
      {content}
    </TextWrapper>
  )
})

// Specialized cell component for notes
export const ColumnPinNoteCell = React.memo(function NotesColumnCell({
  id,
  place,
}: NotesColumnCellProps) {
  const actions = createColumnPinNoteActions(id, () => {
    const dialogTrigger = document.querySelector(
      `[data-notes-dialog-trigger="${id}"]`,
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
      `[data-notes-dialog-trigger="${id}"]`,
    ) as HTMLButtonElement
    dialogTrigger?.click()
  }

  return (
    <TextWrapper id={id} actions={actions}>
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
            <div data-notes-dialog-trigger={id} className="hidden" />
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

export const PhoneCell = ({
  id,
  content,
}: {
  id: string
  content: string
}) => {
  const actions = React.useMemo(
    () => createColumnPinCopyActions(id, content),
    [id, content],
  )

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation()
    window.open(`tel:${content}`, '_blank')
  }

  return (
    <TextWrapper
      id={id}
      actions={[
        ...actions,
        {
          icon: 'Phone',
          onClick: () => {
            posthog.capture('click_call_button', { property: 'value' })
            window.open(`tel:${content}`, '_blank')
          },
          label: 'Call',
        },
        {
          icon: 'faWhatsapp',
          onClick: () => {
            posthog.capture('click_whatsapp_button', { property: 'value' })
            const formattedPhone = content.replace(/\D/g, '')
            window.open(`https://wa.me/${formattedPhone}`, '_blank')
          },
          label: 'WhatsApp',
        },
      ]}
    >
      <span
        className="cursor-pointer text-blue-600 hover:text-blue-800 hover:underline"
        onClick={handleCall}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            posthog.capture('click_phone_number', { property: 'value' })
            handleCall(e as unknown as React.MouseEvent)
          }
        }}
      >
        {content}
      </span>
    </TextWrapper>
  )
}
