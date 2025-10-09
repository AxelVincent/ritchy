import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useEnrichmentMutation } from '@/contexts/EnrichmentMutationContext'
import { cn } from '@/lib/utils'
import type { EnrichmentStatusResponse } from '@ritchy/types'
import { Clock, Loader2, Sparkles, XCircle } from 'lucide-react'
import { memo, useCallback, useMemo, useState } from 'react'

interface EnrichmentActionButtonProps {
  userPlaceId: string
  enrichedStatus?: 'ENRICHED' | 'RECENTLY_ENRICHED' | 'ENRICHMENT_ERROR'
  liveStatus?: EnrichmentStatusResponse
}

const EnrichmentActionButtonComponent = ({
  userPlaceId,
  enrichedStatus,
  liveStatus,
}: EnrichmentActionButtonProps) => {
  const mutation = useEnrichmentMutation()

  // Use local state to track pending status for THIS button only
  // This prevents other buttons from re-rendering when this button's state changes
  const [isLocalPending, setIsLocalPending] = useState(false)

  const handleEnrich = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (
        liveStatus?.status === 'processing' ||
        liveStatus?.status === 'queued'
      ) {
        return
      }
      // Set local pending state IMMEDIATELY (synchronous)
      setIsLocalPending(true)

      mutation.mutate(
        { userPlaceId },
        {
          onSettled: () => {
            // Clear local pending state after mutation settles
            setIsLocalPending(false)
          },
        },
      )
    },
    [liveStatus?.status, mutation, userPlaceId],
  )

  // Memoize button state to avoid recreating objects on every render
  const buttonState = useMemo(() => {
    // Live status takes highest priority (includes optimistic updates)
    // This prevents glitches when switching between enriching different rows
    if (liveStatus) {
      switch (liveStatus.status) {
        case 'queued':
          return {
            icon: (
              <Clock
                style={{ width: '14px', height: '14px' }}
                className="text-blue-500"
              />
            ),
            tooltip: 'Queued for enrichment',
            variant: 'ghost' as const,
            disabled: true,
          }
        case 'processing':
          return {
            icon: (
              <Loader2
                style={{ width: '14px', height: '14px' }}
                className="text-blue-500 animate-spin"
              />
            ),
            tooltip: `${liveStatus.step || 'Processing'} (${liveStatus.progress}%)`,
            variant: 'ghost' as const,
            disabled: true,
          }
        case 'completed': {
          // Check if enrichment completed within last 30 minutes
          const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000
          const isRecentlyCompleted = liveStatus.updatedAt > thirtyMinutesAgo

          return {
            icon: (
              <Sparkles
                style={{ width: '14px', height: '14px' }}
                className={
                  isRecentlyCompleted ? 'text-purple-600' : 'text-blue-600'
                }
              />
            ),
            tooltip: isRecentlyCompleted
              ? 'Recently enriched - click to re-enrich'
              : 'Previously enriched - click to re-enrich',
            variant: 'ghost' as const,
            disabled: false,
          }
        }
        case 'failed':
          return {
            icon: (
              <XCircle
                style={{ width: '14px', height: '14px' }}
                className="text-red-500"
              />
            ),
            tooltip: liveStatus.error || 'Enrichment failed - click to retry',
            variant: 'ghost' as const,
            disabled: false,
          }
      }
    }

    // Show loading state if this button is locally pending
    // Local state prevents other buttons from re-rendering
    if (isLocalPending) {
      return {
        icon: (
          <Loader2
            style={{ width: '14px', height: '14px' }}
            className="text-blue-500 animate-spin"
          />
        ),
        tooltip: 'Starting enrichment...',
        variant: 'ghost' as const,
        disabled: true,
      }
    }

    // Fall back to enriched status from database
    if (enrichedStatus) {
      switch (enrichedStatus) {
        case 'RECENTLY_ENRICHED':
          return {
            icon: (
              <Sparkles
                style={{ width: '14px', height: '14px' }}
                className="text-purple-600"
              />
            ),
            tooltip: 'Recently enriched - click to re-enrich',
            variant: 'ghost' as const,
            disabled: false,
          }
        case 'ENRICHED':
          return {
            icon: (
              <Sparkles
                style={{ width: '14px', height: '14px' }}
                className="text-blue-600"
              />
            ),
            tooltip: 'Previously enriched - click to re-enrich',
            variant: 'ghost' as const,
            disabled: false,
          }
        case 'ENRICHMENT_ERROR':
          return {
            icon: (
              <XCircle
                style={{ width: '14px', height: '14px' }}
                className="text-red-500"
              />
            ),
            tooltip: 'Previous enrichment failed - click to retry',
            variant: 'ghost' as const,
            disabled: false,
          }
      }
    }

    // Default: not enriched
    return {
      icon: (
        <Sparkles
          style={{ width: '14px', height: '14px' }}
          className="text-muted-foreground"
        />
      ),
      tooltip: 'Click to enrich this row',
      variant: 'ghost' as const,
      disabled: false,
    }
  }, [liveStatus, isLocalPending, enrichedStatus])

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={buttonState.variant}
            size="sm"
            className={cn(
              'h-7 w-7 p-0',
              !buttonState.disabled && 'hover:bg-accent',
            )}
            onClick={handleEnrich}
            disabled={buttonState.disabled}
          >
            {buttonState.icon}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{buttonState.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Memoize component to prevent re-renders when props haven't changed
export const EnrichmentActionButton = memo(
  EnrichmentActionButtonComponent,
  (prev, next) => {
    // Custom comparison function for better memoization
    // If userPlaceId or enrichedStatus changed, always re-render
    if (
      prev.userPlaceId !== next.userPlaceId ||
      prev.enrichedStatus !== next.enrichedStatus
    ) {
      return false
    }

    // Handle liveStatus transitions carefully
    const prevHasLiveStatus =
      prev.liveStatus !== undefined && prev.liveStatus !== null
    const nextHasLiveStatus =
      next.liveStatus !== undefined && next.liveStatus !== null

    // If both undefined/null, no change
    if (!prevHasLiveStatus && !nextHasLiveStatus) {
      return true
    }

    // If one is undefined and other is defined, they're different
    if (prevHasLiveStatus !== nextHasLiveStatus) {
      return false
    }

    // Both have liveStatus, compare their properties
    return (
      prev.liveStatus?.status === next.liveStatus?.status &&
      prev.liveStatus?.progress === next.liveStatus?.progress &&
      prev.liveStatus?.step === next.liveStatus?.step &&
      prev.liveStatus?.error === next.liveStatus?.error
    )
  },
)
