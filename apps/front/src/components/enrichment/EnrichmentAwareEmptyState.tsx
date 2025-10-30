import { useEnrichmentStatus } from '@/api/queries/enrichment/useEnrichmentStatus'
import { placeContactsKeys } from '@/api/queries/places/contacts/usePlaceContacts'
import { placeEnrichmentKeys } from '@/api/queries/places/enrichment/usePlaceEnrichment'
import { Button } from '@/components/ui/button'
import { useEnrichmentMutation } from '@/contexts/EnrichmentMutationContext'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2, Sparkles } from 'lucide-react'
import { useEffect } from 'react'
import { EnrichmentProgressView } from './EnrichmentProgressView'
import type { EnrichmentAwareEmptyStateProps } from './types'

const FEATURES = [
  'Company description',
  'Contact information',
  'Governmental data',
  'Financial information',
  'Social media profiles',
]

export const EnrichmentAwareEmptyState = ({
  placeId,
  hasData,
  onEnrichComplete,
}: EnrichmentAwareEmptyStateProps) => {
  const queryClient = useQueryClient()
  const { data: enrichmentStatus } = useEnrichmentStatus(placeId)
  const mutation = useEnrichmentMutation()

  // Invalidate queries when enrichment finishes to fetch fresh data
  useEffect(() => {
    if (enrichmentStatus?.status === 'completed') {
      // Invalidate both contacts and enrichment queries
      queryClient.invalidateQueries({
        queryKey: placeContactsKeys.place(placeId),
      })
      queryClient.invalidateQueries({
        queryKey: placeEnrichmentKeys.place(placeId),
      })

      // Call optional callback
      if (onEnrichComplete) {
        onEnrichComplete()
      }
    }
  }, [enrichmentStatus?.status, placeId, queryClient, onEnrichComplete])

  // If we have data, parent component should render it
  if (hasData) return null

  // Show progress if enriching
  if (
    enrichmentStatus?.status === 'queued' ||
    enrichmentStatus?.status === 'processing'
  ) {
    return <EnrichmentProgressView status={enrichmentStatus} />
  }

  // Show enrichment trigger
  const isPending = mutation.isPending

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-sm space-y-6">
        <div className="space-y-2">
          <Sparkles className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground">
            No Enrichment Data Available
          </h3>
          <p className="text-sm text-muted-foreground">
            Enrich this place to view detailed company information, contacts,
            and more
          </p>
        </div>

        <Button
          onClick={() => mutation.mutate({ userPlaceId: placeId })}
          disabled={isPending}
          size="lg"
          className="gap-2"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Starting Enrichment...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Enrich This Place
            </>
          )}
        </Button>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>Enrichment includes:</p>
          <ul className="list-disc list-inside text-left inline-block">
            {FEATURES.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
