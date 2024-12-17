import { Copy } from 'lucide-react'
import { useState } from 'react'

interface TextWrapperProps {
  children: React.ReactNode
  copyValue?: string
  truncate?: boolean
  maxWidth?: string
}

export const TextWrapper = ({
  children,
  copyValue,
  truncate = true,
  maxWidth,
}: TextWrapperProps) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (!copyValue) return
    navigator.clipboard.writeText(copyValue)
    setCopied(true)
    setTimeout(() => setCopied(false), 500)
  }

  const baseClassName = `mx-0.5 text-sm text-left ${truncate ? 'truncate' : ''}`
  const style = maxWidth ? { maxWidth } : undefined

  if (!copyValue) {
    return (
      <div
        className={baseClassName}
        style={style}
        title={truncate ? String(children) : undefined}
      >
        {children}
      </div>
    )
  }

  return (
    <div className={`flex gap-2 w-full ${baseClassName}`} style={style}>
      <div className="flex flex-row w-full items-center">
        <span
          className={`basis-10/12 ${truncate ? 'truncate' : ''}`}
          title={truncate ? String(children) : undefined}
        >
          {copied ? <span className="text-green-500">Copied!</span> : children}
        </span>

        <Copy
          className="basis-2/12 cursor-pointer hover:text-primary transition-colors w-3 h-3"
          onClick={handleCopy}
        />
      </div>
    </div>
  )
}
