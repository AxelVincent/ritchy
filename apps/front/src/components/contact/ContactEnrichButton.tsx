import { useContactEnrichment } from '@/api/mutations/enrichment/useContactEnrichment'
import { useContactEnrichmentStatus } from '@/api/queries/enrichment/useContactEnrichmentStatus'
import {
  CONTACT_ENRICHMENT_FEATURES,
  CREDIT_COSTS,
} from '@/components/data-table/enrich/constants'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  getStatusTextColorClass,
  resolveEnrichmentStatus,
} from '@/lib/enrichment-status'
import { cn } from '@/lib/utils'
import { Clock, Info, Loader2, RotateCcw, Sparkles } from 'lucide-react'
import { memo, useCallback } from 'react'

interface ContactEnrichButtonProps {
  contactId: string
  companyEnriched: boolean
  disabled?: boolean
  className?: string
}

/**
 * Button component to trigger contact enrichment
 *
 * States:
 * - Company not enriched: Disabled with "Waiting for company" message
 * - Idle: "Enrich (5 credits)" button
 * - Queued: Disabled with "Queued" status
 * - Processing: Disabled with progress percentage
 * - Completed: Disabled with "Enriched" status
 * - Failed: "Retry" button
 */
export const ContactEnrichButton = memo(function ContactEnrichButton({
  contactId,
  companyEnriched,
  disabled = false,
  className,
}: ContactEnrichButtonProps) {
  const { mutate: enrichContact, isPending } = useContactEnrichment()

  // Query for status with polling when processing
  const { data: status } = useContactEnrichmentStatus(contactId, true)

  const handleEnrich = useCallback(() => {
    enrichContact({ contactId })
  }, [enrichContact, contactId])

  // Company must be enriched first
  if (!companyEnriched) {
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled
        className={cn('gap-2', className)}
        title="Company enrichment must complete first"
      >
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">Waiting for company</span>
      </Button>
    )
  }

  // Already enriched - show different states for results vs no results
  if (status?.status === 'completed') {
    const config = resolveEnrichmentStatus(status)
    const Icon = config.icon
    const creditsUsed = status.credits?.creditsUsed ?? 0
    const isNoResults = config.displayStatus === 'completed_no_results'

    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Icon className={cn('h-4 w-4', config.iconClass)} aria-hidden="true" />
        <span
          className={cn(
            'text-sm',
            getStatusTextColorClass(config.displayStatus),
          )}
        >
          {config.label}
        </span>
        <Badge variant={isNoResults ? 'amber' : 'emerald'} className="text-xs">
          {creditsUsed} credit{creditsUsed !== 1 ? 's' : ''}
        </Badge>
      </div>
    )
  }

  // Failed - show retry button
  if (status?.status === 'failed') {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleEnrich}
        disabled={disabled || isPending}
        className={cn('gap-2', className)}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RotateCcw className="h-4 w-4 text-orange-500" />
        )}
        <span className="text-orange-600">Retry</span>
      </Button>
    )
  }

  // Processing or queued
  if (status?.status === 'processing' || status?.status === 'queued') {
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled
        className={cn('gap-2', className)}
      >
        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
        <span className="text-blue-600">
          {status.status === 'queued'
            ? 'Queued'
            : status.progress
              ? `${status.progress}%`
              : 'Processing'}
        </span>
      </Button>
    )
  }

  // Idle - ready to enrich
  return (
    <TooltipProvider>
      <div className={cn('flex items-center gap-1', className)}>
        <Button
          variant="outline"
          size="sm"
          onClick={handleEnrich}
          disabled={disabled || isPending}
          className="gap-2"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          <span>Enrich (up to {CREDIT_COSTS.maxContact})</span>
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p className="font-medium mb-1">Pay per result</p>
            <ul className="text-xs space-y-0.5">
              {CONTACT_ENRICHMENT_FEATURES.map((feature) => (
                <li key={feature.name} className="flex justify-between gap-4">
                  <span>{feature.name}</span>
                  <span className="text-muted-foreground">
                    {feature.credits} credit{feature.credits !== 1 ? 's' : ''}
                    {'perItem' in feature && feature.perItem ? '/each' : ''}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground mt-2">
              Only charged for data found
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
})
