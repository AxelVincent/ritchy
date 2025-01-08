import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Label } from '@radix-ui/react-dropdown-menu'
import { useState } from 'react'

interface TextWrapperProps {
  children: React.ReactNode
  copyValue?: string
  truncate?: boolean
  width?: string
  className?: string
}

export const TextWrapper = ({
  children,
  copyValue,
  truncate = true,
  width,
  className,
}: TextWrapperProps) => {
  const [copied, setCopied] = useState(false)
  const [isTextTruncated, setIsTextTruncated] = useState(false)

  const handleCopy = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (!copyValue) return
    e?.stopPropagation()
    navigator.clipboard.writeText(copyValue)
    setCopied(true)
    setTimeout(() => setCopied(false), 500)
  }

  const baseClassName = `mx-0.5 text-sm text-left ${truncate ? 'truncate' : ''}`
  const style = width ? { width } : { width: '150px' }
  const copyHandlers = copyValue
    ? {
        onClick: (e: React.MouseEvent) => handleCopy(e),
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleCopy(e)
          }
        },
      }
    : {}

  if (!truncate || !isTextTruncated) {
    return (
      <div
        className={`flex gap-2 w-full text-sm ${copyValue ? 'cursor-pointer hover:text-primary' : ''} ${baseClassName} ${className}`}
        style={style}
        {...copyHandlers}
      >
        <Label
          className={`text-sm ${truncate ? 'truncate' : ''}`}
          ref={(el) => {
            if (el && truncate) {
              const isOverflowing = el.scrollWidth > el.clientWidth
              setIsTextTruncated(isOverflowing)
            }
          }}
        >
          {copied ? (
            <span className="text-sm text-green-500">Copied!</span>
          ) : (
            children
          )}
        </Label>
      </div>
    )
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`text-sm truncate ${copyValue ? 'cursor-pointer hover:text-primary' : ''} ${
              className || ''
            }`}
            style={style}
            {...copyHandlers}
          >
            {copied ? (
              <span className="text-sm text-green-500">Copied!</span>
            ) : (
              children
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="max-w-[300px] break-words text-sm">{children}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
