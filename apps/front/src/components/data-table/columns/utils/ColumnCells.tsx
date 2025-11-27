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
import * as React from 'react'

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
    green:
      'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    yellow: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    red: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
    blue: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
    gray: 'bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-300',
  }[color]

  return (
    <Badge className={cn('border-0 font-medium px-2.5 py-0.5 text-xs', styles)}>
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
    <div className="opacity-0 group-hover/cell:opacity-100 transition-all duration-200 ease-out absolute right-2 top-1/2 -translate-y-1/2 bg-background rounded-md p-0.5 border border-border">
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
  getBadge,
}: {
  items: string[]
  itemLabel?: string
  href?: (item: string) => string
  formatDisplay?: (item: string) => string
  getBadge?: (item: string) => BadgeConfig | React.ReactNode
}) {
  const firstItem = items[0]
  const displayText = formatDisplay ? formatDisplay(firstItem) : firstItem
  const badgeResult = getBadge?.(firstItem)

  if (!items.length) {
    return null
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

  // Check if badgeResult is a BadgeConfig object or a React node
  const isBadgeConfig = (badge: unknown): badge is NonNullable<BadgeConfig> => {
    return (
      badge !== null &&
      typeof badge === 'object' &&
      'text' in badge &&
      'color' in badge
    )
  }

  const badgeElement = badgeResult ? (
    isBadgeConfig(badgeResult) ? (
      <CustomBadge text={badgeResult.text} color={badgeResult.color} />
    ) : (
      badgeResult
    )
  ) : null

  return (
    <div className="group/cell relative w-full h-full flex items-center px-2 gap-2">
      <div className="flex-1 min-w-0 overflow-hidden">{content}</div>
      {badgeElement}
      {items.length > 1 && (
        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 font-medium">
          +{items.length - 1} {itemLabel || 'more'}
        </span>
      )}
      <CopyButton valueToCopy={firstItem} ariaLabel="Copy first item" />
    </div>
  )
})

export const SimpleNotesCell = React.memo(function SimpleNotesCell({
  notes,
}: {
  notes: Array<{ note: string; createdAt: Date }> | null | undefined
}) {
  const latestNote = notes?.[0]

  if (!notes?.length) {
    return null
  }

  return (
    <div className="group/cell relative w-full h-full flex items-center px-2 gap-2">
      <div className="flex items-center gap-1.5 text-sm flex-1 min-w-0">
        <span className="truncate flex-1" title={latestNote?.note}>
          {latestNote?.note}
        </span>
        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 font-medium">
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
