import { type Action, TextWrapper } from '@/components/common/TextWrapper'
import { formatPhoneNumberWithCountry } from '@/lib/utils/phone-utils'
import { getCleanUrlDisplay } from '@/lib/utils/url-utils'
import type {
  Email,
  Note,
  SearchResult,
  SocialMediaPlatform,
} from '@ritchy/types'
import React from 'react'
import {
  createColumnPinActions,
  createColumnPinCopyActions,
  createColumnPinMailtoActions,
  createColumnPinNoteActions,
} from './createColumnActions'

import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'
import posthog from 'posthog-js'
import { QualityBadge } from '@/components/contact/QualityBadge'

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
  onClick?: () => void
}

interface CopyCellProps {
  id: string
  content: string
  href?: string
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
      className="text-blue-600 hover:text-blue-800 hover:underline block w-full overflow-hidden text-ellipsis whitespace-nowrap px-2 py-1 rounded transition-colors"
      onClick={(e) => e.stopPropagation()}
      title={content || undefined}
    >
      {getCleanUrlDisplay(content || '')}
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
  onClick,
}: NotesColumnCellProps) {
  const actions = createColumnPinNoteActions(id, () => {
    onClick?.()
  })

  const handleClick = () => {
    onClick?.()
  }

  // Get the most recent note
  const latestNote = place.notes?.[0]

  return (
    <TextWrapper id={id} actions={actions}>
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
        <span className="flex items-center gap-1.5 text-sm w-full">
          <span className="truncate flex-1">{latestNote?.note}</span>
          {place.notes && place.notes.length > 0 && (
            <>
              <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full whitespace-nowrap">
                {place.notes.length}{' '}
                {place.notes.length === 1 ? 'note' : 'notes'}
              </span>
              <span className="truncate text-[11px] w-15 text-muted-foreground/75 whitespace-nowrap">
                {latestNote?.createdAt
                  ? formatDistanceToNow(new Date(latestNote.createdAt), {
                      addSuffix: true,
                    })
                  : ''}
              </span>
            </>
          )}
        </span>
        <div className="flex-1" />
      </div>
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

  const formattedPhoneWithCountry = formatPhoneNumberWithCountry(content)

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
      customTooltipContent={formattedPhoneWithCountry}
    >
      <span
        className="cursor-pointer text-blue-600 hover:text-blue-800 hover:underline"
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
  emails,
  onClick,
}: {
  id: string
  emails: Email[]
  onClick: () => void
}) => {
  // Add null check to prevent the error
  const safeEmails = emails || []

  const actions = React.useMemo(() => {
    const baseActions =
      safeEmails.length > 0
        ? createColumnPinMailtoActions(id, safeEmails[0].email)
        : createColumnPinActions(id)
    return [
      ...baseActions,
      {
        icon: 'Plus' as const,
        onClick: () => onClick?.(),
        label: 'Add email',
      },
    ]
  }, [id, safeEmails, onClick])

  // Empty state - no emails
  if (safeEmails.length === 0) {
    return (
      <TextWrapper id={id} actions={actions}>
        <div
          className="text-muted-foreground hover:text-muted-foreground/80 cursor-pointer w-full h-full min-h-[24px] flex items-center"
          onClick={() => onClick?.()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onClick?.()
            }
          }}
        />
      </TextWrapper>
    )
  }

  // Single email
  if (safeEmails.length === 1) {
    const email = safeEmails[0]
    return (
      <TextWrapper id={id} actions={actions}>
        <div
          className="flex items-center gap-2 w-full cursor-pointer"
          onClick={onClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onClick?.()
            }
          }}
        >
          <span
            className="text-blue-600 hover:text-blue-800 hover:underline truncate"
            onClick={(e) => {
              e.stopPropagation()
              posthog.capture('click_mailto_button', { property: 'value' })
              window.open(`mailto:${email.email}`, '_blank')
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation()
                posthog.capture('click_mailto_button', { property: 'value' })
                window.open(`mailto:${email.email}`, '_blank')
              }
            }}
          >
            {email.email}
          </span>
          {QualityBadge(email)}
        </div>
      </TextWrapper>
    )
  }

  // Multiple emails
  return (
    <TextWrapper id={id} actions={actions}>
      <div
        className="flex items-center gap-2 w-full cursor-pointer"
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            onClick?.()
          }
        }}
      >
        <div className="min-w-0 flex-1 flex items-center gap-2">
          <span
            className="text-blue-600 hover:text-blue-800 hover:underline truncate"
            onClick={(e) => {
              e.stopPropagation()
              posthog.capture('click_mailto_button', { property: 'value' })
              window.open(`mailto:${safeEmails[0].email}`, '_blank')
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation()
                posthog.capture('click_mailto_button', { property: 'value' })
                window.open(`mailto:${safeEmails[0].email}`, '_blank')
              }
            }}
          >
            {safeEmails[0].email}
          </span>
          {QualityBadge(safeEmails[0])}
        </div>
        <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full whitespace-nowrap ml-1.5 flex-shrink-0">
          +{safeEmails.length - 1} more
        </span>
      </div>
    </TextWrapper>
  )
}

export const ContactSocialCell = ({
  id,
  content,
  socialType,
  isPin = true,
}: {
  id: string
  content: string
  socialType: SocialMediaPlatform
  isPin?: boolean
}) => {
  const actions = React.useMemo(() => {
    const baseActions: Action[] = [
      {
        icon: 'Copy',
        onClick: () => {
          navigator.clipboard.writeText(content)
        },
        label: 'Copy',
      },
    ]

    if (isPin) {
      return createColumnPinCopyActions(id, content)
    }

    return baseActions
  }, [id, content, isPin])

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    posthog.capture(`click_${socialType}_link`, { property: 'value' })
    window.open(content, '_blank')
  }

  const displayUrl = getCleanUrlDisplay(content)

  return (
    <TextWrapper id={id} actions={actions}>
      <span
        className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleClick(e as unknown as React.MouseEvent)
          }
        }}
        title={content}
      >
        {displayUrl}
      </span>
    </TextWrapper>
  )
}

export const ContactPhoneCell = ({
  id,
  content,
  isPin = true,
}: {
  id: string
  content: string
  isPin?: boolean
}) => {
  const actions = React.useMemo(() => {
    if (isPin) {
      return createColumnPinCopyActions(id, content)
    }
    return [
      {
        icon: 'Copy' as const,
        onClick: () => {
          navigator.clipboard.writeText(content)
        },
        label: 'Copy',
      },
      {
        icon: 'Phone' as const,
        onClick: () => {
          posthog.capture('click_phone_button', { property: 'value' })
          window.open(`tel:${content}`, '_blank')
        },
        label: 'Call',
      },
      {
        icon: 'faWhatsapp' as const,
        onClick: () => {
          const formattedPhone = content.replace(/\D/g, '')
          posthog.capture('click_whatsapp_button', { property: 'value' })
          window.open(`https://wa.me/${formattedPhone}`, '_blank')
        },
        label: 'WhatsApp',
      },
    ]
  }, [id, content, isPin])

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    posthog.capture('click_phone_button', { property: 'value' })
    window.open(`tel:${content}`, '_blank')
  }

  const formattedPhoneWithCountry = formatPhoneNumberWithCountry(content)

  return (
    <TextWrapper
      id={id}
      actions={actions}
      customTooltipContent={formattedPhoneWithCountry}
    >
      <span
        className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
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
export const CopyCell = React.memo(function CopyCell({
  id,
  content,
  href,
}: CopyCellProps) {
  const actions = React.useMemo(
    () => [
      {
        icon: 'Copy' as const,
        onClick: () => {
          navigator.clipboard.writeText(content)
        },
        label: 'Copy',
      },
    ],
    [content],
  )

  const displayContent = href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 hover:text-blue-800 hover:underline block w-full overflow-hidden text-ellipsis whitespace-nowrap px-2 py-1 rounded transition-colors"
      onClick={(e) => e.stopPropagation()}
      title={content}
    >
      {content}
    </a>
  ) : (
    content
  )

  return (
    <TextWrapper id={id} actions={actions}>
      {/* TODO: This is a hack to get the copy cell to work with emails, it should be refactored to allow other types of content */}
      <span
        className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
        onClick={(e) => {
          e.stopPropagation()
          posthog.capture('click_mailto_button', { property: 'value' })
          window.open(`mailto:${content}`, '_blank')
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.stopPropagation()
            posthog.capture('click_mailto_button', { property: 'value' })
            window.open(`mailto:${content}`, '_blank')
          }
        }}
      >
        {displayContent}
      </span>
    </TextWrapper>
  )
})
