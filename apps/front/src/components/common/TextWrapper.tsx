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
  maxWidth?: string
  className?: string
}

export const TextWrapper = ({
  children,
  copyValue,
  truncate = true,
  maxWidth,
  className,
}: TextWrapperProps) => {
  const [copied, setCopied] = useState(false)
  const [isTextTruncated, setIsTextTruncated] = useState(false)

  const handleCopy = () => {
    if (!copyValue) return
    navigator.clipboard.writeText(copyValue)
    setCopied(true)
    setTimeout(() => setCopied(false), 500)
  }

  const baseClassName = `mx-0.5 text-sm text-left ${truncate ? 'truncate' : ''}`
  const style = maxWidth ? { maxWidth } : undefined

  const content = (
    <div
      className={`flex gap-2 w-full ${copyValue ? 'cursor-pointer hover:text-primary' : ''} ${baseClassName} ${className}`}
      style={style}
      onClick={copyValue ? handleCopy : undefined}
      onKeyDown={
        copyValue
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleCopy()
              }
            }
          : undefined
      }
    >
      <Label
        className={`${truncate ? 'truncate' : ''}`}
        ref={(el) => {
          if (el && truncate) {
            const isOverflowing = el.scrollWidth > el.clientWidth
            setIsTextTruncated(isOverflowing)
          }
        }}
      >
        {copied ? <span className="text-green-500">Copied!</span> : children}
      </Label>
    </div>
  )

  if (!truncate || !isTextTruncated) {
    return content
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent>
          <p className="max-w-[300px] break-words">{children}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
