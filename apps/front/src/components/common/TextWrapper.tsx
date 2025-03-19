import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Label } from '@radix-ui/react-label'
import { Copy, MapPinned, MessageSquareText, Phone, Trash } from 'lucide-react'

import React from 'react'

// Move ICONS outside component to avoid recreation
const ICONS = {
  Copy,
  MapPinned,
  Trash,
  MessageSquareText,
  Phone,
  faWhatsapp,
} as const

export interface Action {
  icon: keyof typeof ICONS
  onClick: (e: React.MouseEvent) => void
  label?: string
}

interface TextWrapperProps {
  children: React.ReactNode
  className?: string
  actions?: Action[]
  id: string
  disableContentTooltip?: boolean
}

// Memoized action button component
const ActionButton = React.memo(
  ({ action }: { action: Action; id: string }) => {
    const Icon = ICONS[action.icon]
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation()
              action.onClick(e)
            }}
            className="h-5 w-5 p-2 rounded-sm"
            size="icon"
          >
            {action.icon === 'faWhatsapp' ? (
              <FontAwesomeIcon
                icon={faWhatsapp}
                className="text-muted-foreground"
              />
            ) : (
              // @ts-expect-error - LucideIcon is a valid JSX element
              <Icon className="text-muted-foreground" />
            )}
          </Button>
        </TooltipTrigger>
        {action.label && (
          <TooltipContent side="bottom">
            <p className="text-xs">{action.label}</p>
          </TooltipContent>
        )}
      </Tooltip>
    )
  },
)

export const TextWrapper = React.memo(
  ({
    children,
    className,
    actions = [],
    id,
    disableContentTooltip = false,
  }: TextWrapperProps) => {
    // Cache the text content check
    const { isTextContent, textContent } = React.useMemo(() => {
      const isText =
        typeof children === 'string' ||
        (React.isValidElement(children) &&
          typeof children.props.children === 'string')

      const content = isText
        ? typeof children === 'string'
          ? children
          : children.props.children
        : null

      return { isTextContent: isText, textContent: content }
    }, [children])

    return (
      <TooltipProvider delayDuration={200}>
        <div className="group relative w-full h-full flex items-center p-2">
          {isTextContent && !disableContentTooltip ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Label className={cn('flex-1 min-w-0', 'truncate', className)}>
                  {children}
                </Label>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">{textContent}</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <Label className={cn('flex-1 min-w-0', className)}>
              {children}
            </Label>
          )}

          {actions.length > 0 && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 absolute right-2 top-1/2 -translate-y-1/2 flex-shrink-0 bg-background rounded-md p-0.5 border border-border">
              {actions.map((action) => (
                <ActionButton
                  key={`${id}-${action.icon}`}
                  action={action}
                  id={id}
                />
              ))}
            </div>
          )}
        </div>
      </TooltipProvider>
    )
  },
)

TextWrapper.displayName = 'TextWrapper'
ActionButton.displayName = 'ActionButton'
