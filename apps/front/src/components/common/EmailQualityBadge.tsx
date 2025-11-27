import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type EmailQuality = 'good' | 'risky' | 'bad' | 'unknown' | null | undefined

interface EmailQualityBadgeProps {
  quality: EmailQuality
  isVerified?: boolean
}

export const EmailQualityBadge = ({
  quality,
  isVerified = true,
}: EmailQualityBadgeProps) => {
  if (!isVerified) {
    return (
      <Badge className="border-0 bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-300 font-medium px-2.5 py-0.5 text-xs">
        unverified
      </Badge>
    )
  }

  // Don't show badge for unknown quality
  if (!quality || quality === 'unknown') {
    return null
  }

  const badgeStyles = {
    good: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    risky: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    bad: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  }[quality]

  return (
    <Badge
      className={cn('border-0 font-medium px-2.5 py-0.5 text-xs', badgeStyles)}
    >
      {quality}
    </Badge>
  )
}
