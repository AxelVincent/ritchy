import { getEstimatedProgress, getStepLabel } from '@/lib/enrichment-steps'
import { cn } from '@/lib/utils'
import type { EnrichmentStatusResponse } from '@api/routes_web/enrich/shared'
import { CheckCircle, Loader2, XCircle } from 'lucide-react'

interface EnrichmentProgressProps {
  status: EnrichmentStatusResponse
  showDetails?: boolean
  className?: string
}

/**
 * Enrichment progress indicator with animated progress bar
 * Shows user-friendly step labels and estimated overall progress
 */
export const EnrichmentProgress = ({
  status,
  showDetails = true,
  className,
}: EnrichmentProgressProps) => {
  const displayProgress = getEstimatedProgress(status.step, status.progress)
  const stepLabel = getStepLabel(status.step)

  if (status.status === 'idle') {
    return null
  }

  if (status.status === 'completed') {
    return (
      <div className={cn('flex items-center gap-2 text-green-600', className)}>
        <CheckCircle className="h-4 w-4" />
        <span className="text-sm">Enriched</span>
      </div>
    )
  }

  if (status.status === 'failed') {
    return (
      <div className={cn('flex items-center gap-2 text-red-600', className)}>
        <XCircle className="h-4 w-4" />
        <span className="text-sm">{status.error ?? 'Failed'}</span>
      </div>
    )
  }

  return (
    <div className={cn('w-full space-y-1', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Loader2 className="h-3 w-3 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">
            {status.status === 'queued' ? 'Queued' : stepLabel}
          </span>
        </div>
        {showDetails && (
          <span className="text-xs font-medium">{displayProgress}%</span>
        )}
      </div>

      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
          style={{ width: `${displayProgress}%` }}
        />
      </div>
    </div>
  )
}
