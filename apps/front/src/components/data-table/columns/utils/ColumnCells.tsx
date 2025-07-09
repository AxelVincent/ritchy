import { TextWrapper } from '@/components/common/TextWrapper'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import type { Note, SearchResult } from '@ritchy/types'
import React from 'react'
import {
  createColumnPinActions,
  createColumnPinCopyActions,
  createColumnPinMailtoActions,
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

  const handleClick = () => {
    const dialogTrigger = document.querySelector(
      `[data-notes-dialog-trigger="${id}"]`,
    ) as HTMLButtonElement
    dialogTrigger?.click()
  }

  // Get the most recent note
  const latestNote = place.notes?.[0]

  return (
    <TextWrapper id={id} actions={actions}>
      <Dialog modal={false}>
        <div
          className="group flex items-center w-full min-h-[24px]"
          onClick={handleClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleClick()
            }
          }}
          aria-label="Open notes"
        >
          <span className="flex items-center gap-1.5 text-sm w-full">
            <span className="truncate flex-1">{latestNote?.note}</span>
            {place.notes && place.notes.length > 0 && (
              <>
                <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full whitespace-nowrap">
                  {place.notes.length}{' '}
                  {place.notes.length === 1 ? 'note' : 'notes'}
                </span>
                <span className="truncate text-[11px] w-15 text-muted-foreground/75 whitespace-nowrap">
                  {formatDistanceToNow(new Date(latestNote?.createdAt || ''), {
                    addSuffix: true,
                  })}
                </span>
              </>
            )}
          </span>
          <div className="flex-1" />
          <DialogTrigger asChild>
            <div data-notes-dialog-trigger={id} className="hidden" />
          </DialogTrigger>
        </div>
        <DialogContent className="max-w-md h-[60vh] flex flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <Notes
              placeId={place.id}
              searchId={place.searchId}
              listId={place.listId}
            />
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
            posthog.capture('click_phone_button', { property: 'value' })
            window.open(`tel:${content}`, '_blank')
          },
          label: 'Call',
        },
        {
          icon: 'faWhatsapp',
          onClick: () => {
            const formattedPhone = content.replace(/\D/g, '')
            posthog.capture('click_whatsapp_button', { property: 'value' })
            window.open(`https://wa.me/${formattedPhone}`, '_blank')
          },
          label: 'WhatsApp',
        },
      ]}
    >
      <span
        className="text-blue-600 hover:text-blue-800 hover:underline"
        onClick={handleCall}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleCall(e as unknown as React.MouseEvent)
          }
        }}
      >
        {content}
      </span>
    </TextWrapper>
  )
}

export const ContactEmailCell = ({
  id,
  content,
}: {
  id: string
  content: string
}) => {
  const actions = React.useMemo(
    () => createColumnPinMailtoActions(id, content),
    [id, content],
  )

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    posthog.capture('click_mailto_button', { property: 'value' })
    window.open(`mailto:${content}`, '_blank')
  }

  return (
    <TextWrapper id={id} actions={actions}>
      <span
        className="text-blue-600 hover:text-blue-800 hover:underline"
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleClick(e as unknown as React.MouseEvent)
          }
        }}
      >
        {content}
      </span>
    </TextWrapper>
  )
}
