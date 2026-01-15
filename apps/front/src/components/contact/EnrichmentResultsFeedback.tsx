import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  getCreditsBreakdownMessage,
  resolveEnrichmentStatus,
} from '@/lib/enrichment-status'
import { cn } from '@/lib/utils'
import type { EnrichmentStatusResponse } from '@api/routes_web/enrich/shared'

interface EnrichmentResultsFeedbackProps {
  status: EnrichmentStatusResponse | null | undefined
  className?: string
}

/**
 * Displays enrichment results feedback in an expanded contact card
 * Shows different messaging for success (with data) vs processed (no data found)
 */
export const EnrichmentResultsFeedback = ({
  status,
  className,
}: EnrichmentResultsFeedbackProps) => {
  // Only show feedback when enrichment is completed
  if (status?.status !== 'completed') {
    return null
  }

  const config = resolveEnrichmentStatus(status)
  const Icon = config.icon
  const creditsUsed = status.credits?.creditsUsed ?? 0
  const breakdown = status.credits?.creditsBreakdown
  const isNoResults = config.displayStatus === 'completed_no_results'

  return (
    <Alert
      className={cn(
        'border-l-4',
        isNoResults
          ? 'border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20'
          : 'border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20',
        className,
      )}
    >
      <Icon className={cn('h-4 w-4', config.iconClass)} aria-hidden="true" />
      <AlertTitle
        className={
          isNoResults
            ? 'text-amber-900 dark:text-amber-300'
            : 'text-emerald-900 dark:text-emerald-300'
        }
      >
        {isNoResults ? 'No contact information found' : 'Contact enriched'}
      </AlertTitle>
      <AlertDescription>
        {isNoResults ? (
          <div className="space-y-2">
            <p className="text-amber-800 dark:text-amber-400">
              We searched for LinkedIn profile, email addresses, and phone
              numbers but couldn't find any publicly available information for
              this contact.
            </p>
            <Badge variant="amber" className="text-xs">
              0 credits used
            </Badge>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-emerald-800 dark:text-emerald-400">
              Found {getCreditsBreakdownMessage(breakdown)}.
            </p>
            <Badge variant="emerald" className="text-xs">
              {creditsUsed} credit{creditsUsed !== 1 ? 's' : ''} used
            </Badge>
          </div>
        )}
      </AlertDescription>
    </Alert>
  )
}
