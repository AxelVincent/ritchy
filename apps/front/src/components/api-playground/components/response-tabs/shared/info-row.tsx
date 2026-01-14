import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'
import { CopyButton } from './copy-button'

interface InfoRowProps {
  label: string
  value: string | number | null | undefined
  icon?: LucideIcon
  mono?: boolean
  copyable?: boolean
  className?: string
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
