import type { Action } from '@/components/common/TextWrapper'
import { useMapStore } from '@/components/map-display/store/useMapStore'
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
): Action[] => {
  const setSelectedPlaceId = useMapStore.getState().setSelectedPlaceId

  return [
    {
      icon: 'MapPinned' as const,
      onClick: () => {
        posthog.capture('pin_cell_place', { property: 'value' })
        setSelectedPlaceId(id)
      },
      label: 'Pin to map',
    },
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

export const createColumnPinActions = (id: string): Action[] => {
  const setSelectedPlaceId = useMapStore.getState().setSelectedPlaceId

  return [
    {
      icon: 'MapPinned',
      onClick: () => {
        posthog.capture('pin_cell_place', { property: 'value' })
        setSelectedPlaceId(id)
      },
      label: 'Pin to map',
    },
  ]
}

export const createColumnPinNoteActions = (
  id: string,
  openNotesDialog: () => void,
): Action[] => {
  const setSelectedPlaceId = useMapStore.getState().setSelectedPlaceId

  return [
    {
      icon: 'MapPinned' as const,
      onClick: () => {
        posthog.capture('pin_cell_place', { property: 'value' })
        setSelectedPlaceId(id)
      },
      label: 'Pin to map',
    },
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
): Action[] => {
  return [
    ...(email
      ? [
          ...createColumnPinCopyActions(id, email),
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

export const createColumnPinEmailActions = (
  id: string,
  email: string | null,
  onAddEmail: () => void,
): Action[] => {
  return [
    ...(email ? createColumnPinMailtoActions(id, email) : []),
    {
      icon: 'Plus' as const,
      onClick: onAddEmail,
      label: 'Add email',
    },
  ]
}
