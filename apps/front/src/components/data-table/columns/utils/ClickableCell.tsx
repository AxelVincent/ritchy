import type { PlaceTabValue } from '@/components/map-display/store/useMapStore'
import { useSelectionSafe } from '@/contexts/SelectionContext'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface ClickableCellProps {
  placeId: string
  tab: PlaceTabValue
  children: ReactNode
  className?: string
  disabled?: boolean
}

export const ClickableCell = ({
  placeId,
  tab,
  children,
  className,
  disabled = false,
}: ClickableCellProps) => {
  const selection = useSelectionSafe()

  const handleClick = () => {
    if (!disabled && selection) {
      selection.selectPlaceAndTab(placeId, tab)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
      e.preventDefault()
      handleClick()
    }
  }

  return (
    <div
      className={cn(
        'w-full h-full flex items-center px-2',
        !disabled && 'cursor-pointer',
        className,
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
    >
      {children}
    </div>
  )
}
