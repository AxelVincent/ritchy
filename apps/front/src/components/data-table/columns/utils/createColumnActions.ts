import type { Action } from '@/components/common/TextWrapper'
import { toast } from '@/hooks/use-toast'
import posthog from 'posthog-js'

// Create the toast function once, outside of the action creation
const showCopiedToast = (displayName: string) => {
  toast({
    title: displayName,
    description: 'Copied to clipboard',
  })
}

export const createColumnPinCopyActions = (
  id: string,
  text: string | null,
  selectPlace?: (id: string) => void,
): Action[] => {
  return [
    ...(selectPlace
      ? [
          {
            icon: 'MapPinned' as const,
            onClick: () => {
              posthog.capture('pin_cell_place', { property: 'value' })
              selectPlace(id)
            },
            label: 'Pin to map',
          },
        ]
      : []),
    ...(text
      ? [
          {
            icon: 'Copy' as const,
            onClick: () => {
              posthog.capture('copy_cell_content', { property: 'value' })
              navigator.clipboard.writeText(text)
              showCopiedToast(text)
            },
            label: 'Copy',
          },
        ]
      : []),
  ]
}

export const createColumnPinActions = (
  id: string,
  selectPlace?: (id: string) => void,
): Action[] => {
  if (!selectPlace) return []

  return [
    {
      icon: 'MapPinned',
      onClick: () => {
        posthog.capture('pin_cell_place', { property: 'value' })
        selectPlace(id)
      },
      label: 'Pin to map',
    },
  ]
}

export const createColumnPinNoteActions = (
  id: string,
  openNotesDialog: () => void,
  selectPlace?: (id: string) => void,
): Action[] => {
  return [
    ...(selectPlace
      ? [
          {
            icon: 'MapPinned' as const,
            onClick: () => {
              posthog.capture('pin_cell_place', { property: 'value' })
              selectPlace(id)
            },
            label: 'Pin to map',
          },
        ]
      : []),
    {
      icon: 'MessageSquareText',
      onClick: () => {
        posthog.capture('open_cell_note_dialog', { property: 'value' })
        openNotesDialog()
      },
      label: 'Add note',
    },
  ]
}

export const createColumnPinMailtoActions = (
  id: string,
  email: string | null,
  selectPlace?: (id: string) => void,
): Action[] => {
  return [
    ...(email
      ? [
          ...createColumnPinCopyActions(id, email, selectPlace),
          {
            icon: 'Mail' as const,
            onClick: () => {
              posthog.capture('click_mailto_button', { property: 'value' })
              window.open(`mailto:${email}`, '_blank')
            },
            label: 'Send email',
          },
        ]
      : []),
  ]
}
