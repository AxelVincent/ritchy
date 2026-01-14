import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Check, Copy } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useState } from 'react'

interface InfoRowProps {
  label: string
  value: string | number | null | undefined
  icon?: LucideIcon
  mono?: boolean
  copyable?: boolean
  className?: string
}

const CopyButton = ({ value }: { value: string }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6 shrink-0"
      onClick={handleCopy}
    >
      {copied ? (
        <Check className="h-3 w-3 text-green-500" />
      ) : (
        <Copy className="h-3 w-3 text-muted-foreground" />
      )}
    </Button>
  )
}

export const InfoRow = ({
  label,
  value,
  icon: Icon,
  mono,
  copyable,
  className,
}: InfoRowProps) => {
  if (value === null || value === undefined || value === '') return null

  const stringValue = String(value)
  const shouldShowCopy = copyable ?? mono

  return (
    <div className={className}>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground shrink-0" />}
        <p
          className={cn('text-sm truncate', mono && 'font-mono text-xs')}
          title={stringValue}
        >
          {value}
        </p>
        {shouldShowCopy && <CopyButton value={stringValue} />}
      </div>
    </div>
  )
}
