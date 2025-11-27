import { Badge } from '@/components/ui/badge'

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
    return <Badge variant="slate">unverified</Badge>
  }

  // Don't show badge for unknown quality
  if (!quality || quality === 'unknown') {
    return null
  }

  const badgeVariant = {
    good: 'emerald' as const,
    risky: 'amber' as const,
    bad: 'rose' as const,
  }[quality]

  return <Badge variant={badgeVariant}>{quality}</Badge>
}
