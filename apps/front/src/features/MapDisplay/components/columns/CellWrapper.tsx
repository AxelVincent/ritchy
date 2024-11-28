import { useState } from 'react'

interface CellWrapperProps {
  children: React.ReactNode
  copyValue?: string
}

export const CellWrapper = ({ children, copyValue }: CellWrapperProps) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (!copyValue) return
    navigator.clipboard.writeText(copyValue)
    setCopied(true)
    setTimeout(() => setCopied(false), 500)
  }

  const baseClassName = 'mx-0.5 text-sm text-left truncate'

  if (!copyValue) {
    return <div className={baseClassName}>{children}</div>
  }

  return (
    <div className={baseClassName}>
      <div
        className="cursor-pointer hover:text-primary transition-colors relative truncate"
        onClick={handleCopy}
        onKeyDown={(e) => e.key === 'Enter' && handleCopy()}
        title="Click to copy"
      >
        {copied ? <span className="text-green-500">Copied!</span> : children}
      </div>
    </div>
  )
}
