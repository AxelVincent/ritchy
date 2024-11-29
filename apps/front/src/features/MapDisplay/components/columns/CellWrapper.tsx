import { useState } from 'react'

interface CellWrapperProps {
  children: React.ReactNode
  copyValue?: string
  truncate?: boolean
  maxWidth?: string
}

export const CellWrapper = ({
  children,
  copyValue,
  truncate = true,
  maxWidth
}: CellWrapperProps) => {
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
    <div className={baseClassName} style={style}>
      <div
        className={`cursor-pointer hover:text-primary transition-colors relative ${truncate ? 'truncate' : ''}`}
        onClick={handleCopy}
        onKeyDown={(e) => e.key === 'Enter' && handleCopy()}
        title={
          truncate ? `${String(children)} (Click to copy)` : 'Click to copy'
        }
      >
        {copied ? <span className="text-green-500">Copied!</span> : children}
      </div>
    </div>
  )
}
