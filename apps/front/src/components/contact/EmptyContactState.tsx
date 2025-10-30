import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Sparkles, Users } from 'lucide-react'

/**
 * @deprecated Use EnrichmentAwareEmptyState from '@/components/enrichment' instead.
 * This component lacks enrichment status integration and real-time progress updates.
 * Will be removed in the next major version.
 *
 * Migration:
 * ```tsx
 * // Old:
 * <EmptyContactState hasWebsite={!!place.website} />
 *
 * // New:
 * <EnrichmentAwareEmptyState
 *   placeId={place.id}
 *   hasWebsite={!!place.website}
 *   hasData={contacts.length > 0}
 *   emptyStateConfig={{
 *     icon: Users,
 *     title: 'No Contact Information',
 *     description: (hasWebsite) => hasWebsite
 *       ? 'Enrich this place to discover contacts'
 *       : 'Add a website to enable enrichment',
 *     features: ['Email addresses', 'Phone numbers', 'Social media profiles']
 *   }}
 * />
 * ```
 */
interface EmptyContactStateProps {
  hasWebsite: boolean
  onEnrich?: () => void
  isEnriching?: boolean
}

export const EmptyContactState = ({
  hasWebsite,
  onEnrich,
  isEnriching = false,
}: EmptyContactStateProps) => {
  return (
    <div className="flex items-center justify-center p-8">
      <Card className="max-w-md w-full border-dashed border-2">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="rounded-full bg-primary/10 p-4">
              <Users className="h-8 w-8 text-primary" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">No Contact Information</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {hasWebsite
                  ? 'Enrich this place to discover emails, phones, and social media profiles'
                  : 'Add a website to enable enrichment for contact information'}
              </p>
            </div>

            {hasWebsite && onEnrich && (
              <div className="flex flex-col items-center gap-3 w-full">
                <Button
                  onClick={onEnrich}
                  disabled={isEnriching}
                  size="lg"
                  className="w-full max-w-xs"
                >
                  {isEnriching ? (
                    <>
                      <Sparkles className="mr-2 h-4 w-4 animate-pulse" />
                      Enriching...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Enrich Now
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Enrichment uses 1 credit
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
