import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { TooltipContent } from '@/components/ui/tooltip'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { Copy } from 'lucide-react'
import React from 'react'

// Add this type definition near the top of the file, after imports
export type BadgeConfig = {
  text: string
  color: 'green' | 'yellow' | 'red' | 'blue' | 'gray'
} | null

// Helper component for rendering badges
const CustomBadge = ({
  text,
  color,
}: { text: string; color: NonNullable<BadgeConfig>['color'] }) => {
  const styles = {
    green: 'border-green-600 text-green-600',
    yellow: 'border-orange-400 text-orange-400',
    red: 'border-red-600 text-red-600',
    blue: 'border-blue-600 text-blue-600',
    gray: 'border-gray-500 text-gray-600',
  }[color]

  return (
    <Badge variant="outline" className={` ${styles}`}>
      {text}
    </Badge>
  )
}

// Reusable copy button component for all cells
export const CopyButton = React.memo(function CopyButton({
  valueToCopy,
  ariaLabel = 'Copy',
}: {
  valueToCopy: string
  ariaLabel?: string
}) {
  const handleCopy = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      navigator.clipboard.writeText(valueToCopy)
      toast({
        title: 'Copied to clipboard',
        description: valueToCopy,
        duration: 2000,
      })
    },
    [valueToCopy],
  )

  return (
    <div className="opacity-0 group-hover/cell:opacity-100 transition-opacity absolute right-2 top-1/2 -translate-y-1/2 bg-background rounded-md p-0.5 border border-border">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn('h-7 w-7 p-0', 'hover:bg-accent')}
              onClick={handleCopy}
              disabled={false}
            >
              <Copy style={{ width: '14px', height: '14px' }} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{ariaLabel}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
})

// Lightweight wrapper for custom content (no actions, just container)
export const SimpleCell = React.memo(function SimpleCell({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="w-full h-full flex items-center px-2">{children}</div>
})

export const SimpleArrayCell = React.memo(function SimpleArrayCell({
  items,
  itemLabel,
  href,
  formatDisplay,
  onClick,
  getBadge,
}: {
  items: string[]
  itemLabel?: string
  href?: (item: string) => string
  formatDisplay?: (item: string) => string
  onClick?: () => void
  getBadge?: (item: string) => BadgeConfig
}) {
  const firstItem = items[0]
  const displayText = formatDisplay ? formatDisplay(firstItem) : firstItem
  const badge = getBadge?.(firstItem)

  const handleCellClick = React.useCallback(() => {
    onClick?.()
  }, [onClick])

  if (!items.length) {
    return (
      <div
        className="w-full h-full flex items-center px-2 cursor-pointer"
        onClick={handleCellClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleCellClick()
          }
        }}
      >
        {null}
      </div>
    )
  }

  const content = href ? (
    <a
      href={href(firstItem)}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 hover:text-blue-800 hover:underline block w-full truncate"
      onClick={(e) => e.stopPropagation()}
      title={firstItem}
    >
      {displayText}
    </a>
  ) : (
    <span className="block w-full truncate" title={firstItem}>
      {displayText}
    </span>
  )

  return (
    <div
      className="group/cell relative w-full h-full flex items-center px-2 gap-2 cursor-pointer"
      onClick={handleCellClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleCellClick()
        }
      }}
    >
      <div className="flex-1 min-w-0 overflow-hidden">{content}</div>
      {badge && <CustomBadge text={badge.text} color={badge.color} />}
      {items.length > 1 && (
        <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
          +{items.length - 1} {itemLabel || 'more'}
        </span>
      )}
      <CopyButton valueToCopy={firstItem} ariaLabel="Copy first item" />
    </div>
  )
})

export const SimpleNotesCell = React.memo(function SimpleNotesCell({
  notes,
  onClick,
}: {
  notes: Array<{ note: string; createdAt: Date }> | null | undefined
  onClick?: () => void
}) {
  const latestNote = notes?.[0]

  const handleCellClick = React.useCallback(() => {
    onClick?.()
  }, [onClick])

  if (!notes?.length) {
    return (
      <div
        className="w-full h-full flex items-center px-2 cursor-pointer"
        onClick={handleCellClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleCellClick()
          }
        }}
      >
        {null}
      </div>
    )
  }

  return (
    <div
      className="group/cell relative w-full h-full flex items-center px-2 gap-2 cursor-pointer"
      onClick={handleCellClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleCellClick()
        }
      }}
    >
      <div className="flex items-center gap-1.5 text-sm flex-1 min-w-0">
        <span className="truncate flex-1" title={latestNote?.note}>
          {latestNote?.note}
        </span>
        <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
          {notes.length} {notes.length === 1 ? 'note' : 'notes'}
        </span>
        {latestNote?.createdAt && (
          <span className="text-[11px] text-muted-foreground/75 whitespace-nowrap flex-shrink-0">
            {formatDistanceToNow(new Date(latestNote.createdAt), {
              addSuffix: true,
            })}
          </span>
        )}
      </div>
      <CopyButton valueToCopy={latestNote?.note || ''} ariaLabel="Copy note" />
    </div>
  )
})

export const CopyCell = React.memo(function CopyCell({
  content,
  href,
  formatDisplay,
}: {
  content: string
  href?: string
  formatDisplay?: (content: string) => string
}) {
  const displayText = formatDisplay ? formatDisplay(content) : content

  const displayContent = href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 hover:text-blue-800 hover:underline block truncate px-2 py-1 rounded transition-colors"
      onClick={(e) => e.stopPropagation()}
      title={content}
    >
      {displayText}
    </a>
  ) : (
    <span className="block truncate px-2 py-1">{displayText}</span>
  )

  return (
    <div className="group/cell relative w-full h-full flex items-center">
      {displayContent}
      <CopyButton valueToCopy={content} ariaLabel="Copy" />
    </div>
  )
})
