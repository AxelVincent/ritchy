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
import React, { useEffect } from 'react'

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
  const labelRef = React.useRef<HTMLLabelElement>(null)
  const [isTruncated, setIsTruncated] = React.useState(false)
  const [isTextContent, setIsTextContent] = React.useState(false)

  // Check if children contains text content
  useEffect(() => {
    if (labelRef.current) {
      const hasTextContent =
        typeof children === 'string' ||
        (React.isValidElement(children) &&
          typeof children.props.children === 'string')
      setIsTextContent(hasTextContent)
    }
  }, [children])

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    const checkTruncation = () => {
      if (labelRef.current && isTextContent) {
        setIsTruncated(
          labelRef.current.scrollWidth > labelRef.current.clientWidth,
        )
      }
    }

    checkTruncation()
    window.addEventListener('resize', checkTruncation)
    return () => window.removeEventListener('resize', checkTruncation)
  }, [children, isTextContent])

  return (
    <div className="group relative w-full h-full flex items-center p-2">
      {isTruncated && isTextContent ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Label
                ref={labelRef}
                className={cn(
                  'flex-1 min-w-0',
                  isTextContent && 'truncate',
                  className,
                )}
              >
                {children}
              </Label>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">{children}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <Label
          ref={labelRef}
          className={cn(
            'flex-1 min-w-0',
            isTextContent && 'truncate',
            className,
          )}
        >
          {children}
        </Label>
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
