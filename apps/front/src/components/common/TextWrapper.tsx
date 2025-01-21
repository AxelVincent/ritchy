import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { Label } from '@radix-ui/react-label'
import { Copy, MapPinned, MessageSquareText, Trash } from 'lucide-react'
import React from 'react'

// Create a map of allowed icons
const ICONS = {
  Copy,
  MapPinned,
  Trash,
  MessageSquareText,
} as const

interface Action {
  icon: keyof typeof ICONS
  onClick: (e: React.MouseEvent) => void
  label?: string
}

interface TextWrapperProps {
  children: React.ReactNode
  className?: string
  actions?: Action[]
  id?: string
}

export const TextWrapper = ({
  children,
  className,
  actions = [],
  id,
}: TextWrapperProps) => {
  const isTextContent =
    typeof children === 'string' ||
    (React.isValidElement(children) &&
      typeof children.props.children === 'string')

  const textContent = isTextContent
    ? typeof children === 'string'
      ? children
      : children.props.children
    : null

  return (
    <div className="group relative w-full h-full flex items-center p-2">
      {isTextContent ? (
        <TooltipProvider>
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
        </TooltipProvider>
      ) : (
        <Label className={cn('flex-1 min-w-0', className)}>{children}</Label>
      )}

      {actions.length > 0 && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 absolute right-2 top-1/2 -translate-y-1/2 flex-shrink-0 bg-background rounded-md p-0.5 border border-border">
          {actions.map((action) => {
            const Icon = ICONS[action.icon]
            return (
              <TooltipProvider key={id} delayDuration={200}>
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
                      <Icon className="text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  {action.label && (
                    <TooltipContent side="bottom">
                      <p className="text-xs">{action.label}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            )
          })}
        </div>
      )}
    </div>
  )
}
