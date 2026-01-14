import { Badge } from '@/components/ui/badge'
import { Clock, Coins, Zap } from 'lucide-react'
import { CopyButton } from './copy-button'

interface MetaBadgeProps {
  requestId: string
  processingTimeMs: number
  creditsUsed: number
  creditsRemaining: number
}

export const MetaBadge = ({
  requestId,
  processingTimeMs,
  creditsUsed,
  creditsRemaining,
}: MetaBadgeProps) => {
  // Truncate request ID for display
  const truncatedId =
    requestId.length > 12
      ? `${requestId.slice(0, 6)}...${requestId.slice(-4)}`
      : requestId

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="outline" className="gap-1.5 text-xs">
        <Clock className="h-3 w-3" />
        {processingTimeMs}ms
      </Badge>
      <Badge variant="outline" className="gap-1.5 text-xs">
        <Zap className="h-3 w-3" />
        {creditsUsed} credit{creditsUsed !== 1 ? 's' : ''} used
      </Badge>
      <Badge variant="secondary" className="gap-1.5 text-xs">
        <Coins className="h-3 w-3" />
        {creditsRemaining} remaining
      </Badge>
      <div className="flex items-center gap-1">
        <span
          className="text-xs text-muted-foreground font-mono"
          title={requestId}
        >
          {truncatedId}
        </span>
        <CopyButton value={requestId} />
      </div>
    </div>
  )
}
