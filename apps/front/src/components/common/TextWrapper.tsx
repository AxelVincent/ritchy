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
  className?: string
  showTooltip?: boolean
}

export const TextWrapper = ({
  children,
  copyValue,
  truncate = true,
  className,
  showTooltip = true,
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

  const content = (
    <span
      className={copyValue ? 'cursor-pointer hover:text-primary' : ''}
      {...copyHandlers}
    >
      {copied ? (
        <span className="text-sm text-green-500">Copied!</span>
      ) : (
        children
      )}
    </span>
  )

  const shouldShowFullTooltip = truncate && isTextTruncated && showTooltip
  const baseClassName = `w-full text-sm p-2 ${className || ''} ${
    truncate ? 'truncate' : ''
  }`

  const checkTruncation = (el: HTMLElement | null) => {
    if (el && truncate) {
      const isOverflowing = el.scrollWidth > el.clientWidth
      setIsTextTruncated(isOverflowing)
    }
  }

  if (shouldShowFullTooltip) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={baseClassName}>{content}</div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="max-w-[300px] break-words text-sm">{children}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <div className={baseClassName}>
      {copyValue && showTooltip ? (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Label ref={checkTruncation}>{content}</Label>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-sm">Click to copy</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <Label ref={checkTruncation}>{content}</Label>
      )}
    </div>
  )
}
