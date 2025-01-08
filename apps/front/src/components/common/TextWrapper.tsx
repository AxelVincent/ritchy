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

  const handleCopy = () => {
    if (!copyValue) return
    navigator.clipboard.writeText(copyValue)
    setCopied(true)
    setTimeout(() => setCopied(false), 500)
  }

  const baseClassName = `mx-0.5 text-sm text-left ${truncate ? 'truncate' : ''}`
  const style = width ? { width } : { width: '150px' }

  if (!truncate || !isTextTruncated) {
    return (
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
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side="bottom" className="bg-white dark:bg-gray-800">
          <p className="max-w-[300px] break-words">{children}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
