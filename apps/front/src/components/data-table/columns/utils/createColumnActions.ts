import type { Action } from '@/components/common/TextWrapper'
import { toast } from '@/hooks/use-toast'

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
  setSelectedPlaceId?: (id: string) => void,
): Action[] => [
  {
    icon: 'MapPinned' as const,
    onClick: () => setSelectedPlaceId?.(id),
    label: 'Pin to map',
  },
  ...(text
    ? [
        {
          icon: 'Copy' as const,
          onClick: () => {
            navigator.clipboard.writeText(text)
            showCopiedToast(text)
          },
          label: 'Copy',
        },
      ]
    : []),
]

export const createColumnPinActions = (
  id: string,
  setSelectedPlaceId?: (id: string) => void,
): Action[] => [
  {
    icon: 'MapPinned',
    onClick: () => setSelectedPlaceId?.(id),
    label: 'Pin to map',
  },
]

export const createColumnPinNoteActions = (
  id: string,
  openNotesDialog: () => void,
  setSelectedPlaceId?: (id: string) => void,
): Action[] => [
  {
    icon: 'MapPinned' as const,
    onClick: () => setSelectedPlaceId?.(id),
    label: 'Pin to map',
  },
  {
    icon: 'MessageSquareText',
    onClick: () => {
      openNotesDialog()
    },
    label: 'Add note',
  },
]
