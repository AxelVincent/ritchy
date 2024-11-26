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

  if (!copyValue) {
    return <div className="mx-1 my-1 truncate">{children}</div>
  }

  return (
    <div className="mx-1 my-1">
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
