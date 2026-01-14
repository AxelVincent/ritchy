import { cn } from '@/lib/utils'
import { Check, Copy } from 'lucide-react'
import { useCallback, useState } from 'react'

interface CopyButtonProps {
  value: string
  className?: string
  iconSize?: 'sm' | 'md'
}

export const CopyButton = ({
  value,
  className,
  iconSize = 'sm',
}: CopyButtonProps) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()
      try {
        await navigator.clipboard.writeText(value)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        console.error('Failed to copy:', err)
      }
    },
    [value],
  )

  const iconClass = iconSize === 'sm' ? 'h-3 w-3' : 'h-4 w-4'

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        'inline-flex items-center justify-center rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors',
        copied && 'text-green-500 hover:text-green-500',
        className,
      )}
      title={copied ? 'Copied!' : 'Copy to clipboard'}
    >
      {copied ? (
        <Check className={iconClass} />
      ) : (
        <Copy className={iconClass} />
      )}
    </button>
  )
}
