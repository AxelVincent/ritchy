import { usePlaceReviewsQuery } from '@/api/queries/places/reviews/usePlaceReviews'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Place } from '@ritchy/types'
import { Info, Loader2, StarIcon } from 'lucide-react'
import { Languages } from 'lucide-react'
import { useState } from 'react'

// Add this type to track which reviews are showing original text
type OriginalTextMap = Record<string, boolean>

// Add this utility function to generate initials
const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const STAR_KEYS = ['star-1', 'star-2', 'star-3', 'star-4', 'star-5'] as const

export const PlaceReviewsTab = ({ place }: { place: Place }) => {
  const [showOriginal, setShowOriginal] = useState<OriginalTextMap>({})
  const { data, isLoading, error } = usePlaceReviewsQuery(place.id)

  const toggleOriginalText = (reviewId: string) => {
    setShowOriginal((prev) => ({
      ...prev,
      [reviewId]: !prev[reviewId],
    }))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-sm text-destructive">
        Error loading notes: {error.message}
      </div>
    )
  }

  if (data && 'reviews' in data && data.reviews.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 px-4">
        <div className="flex flex-col items-center text-center space-y-2 text-muted-foreground">
          <Info className="h-5 w-5" />
          <p className="text-sm">No reviews available for this place</p>
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      {place.rating && (
        <div className="border-b p-4">
          <div className="space-y-1">
            <div className="text-2xl font-semibold">
              {place.rating.toFixed(1)}
            </div>
            <div className="flex items-center gap-1">
              {STAR_KEYS.map((key) => (
                <StarIcon
                  key={key}
                  className={`h-4 w-4 ${
                    Number(key.split('-')[1]) <= Math.round(place.rating ?? 0)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'fill-muted text-muted'
                  }`}
                />
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              {place.ratingCount?.toLocaleString()} reviews
            </p>
          </div>
        </div>
      )}

      <div className="space-y-4 p-4">
        {data &&
          'reviews' in data &&
          data.reviews.map((review) => {
            const reviewId = `${review.authorAttribution?.displayName}-${review.publishTime}`
            const hasTranslation =
              review.text?.text !== review.originalText?.text

            return (
              <div key={reviewId} className="rounded-lg border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback>
                      {getInitials(review.authorAttribution?.displayName ?? '')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">
                      {review.authorAttribution?.displayName}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {review.relativePublishTimeDescription}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 mb-2">
                  {STAR_KEYS.map((key) => (
                    <StarIcon
                      key={key}
                      className={`h-3 w-3 ${
                        Number(key.split('-')[1]) <= review.rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'fill-muted text-muted'
                      }`}
                    />
                  ))}
                </div>
                <div className="space-y-2">
                  <p className="text-sm">
                    {showOriginal[reviewId]
                      ? review.originalText?.text
                      : review.text?.text}
                  </p>

                  {hasTranslation && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs"
                      onClick={() => toggleOriginalText(reviewId)}
                    >
                      <Languages className="mr-1 h-3 w-3" />
                      {showOriginal[reviewId]
                        ? 'Show translation'
                        : 'Show original'}
                    </Button>
                  )}
                </div>
              </div>
            )
          })}

        {data && 'reviews' in data && data.reviews.length === 5 && (
          <div className="text-center pt-2 border-t">
            <p className="text-sm text-muted-foreground mb-2">
              Showing the {data.reviews.length} most relevant reviews
            </p>
            <a
              href={`https://www.google.com/maps/place/?q=place_id:${place.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              View all reviews on Google Maps →
            </a>
          </div>
        )}
      </div>
    </ScrollArea>
  )
}
