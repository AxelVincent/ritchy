import { usePlaceReviewsQuery } from '@/api/queries/places/reviews/usePlaceReviews'
import { OpeningHoursContent } from '@/components/common/OpeningHours'
import { StatusIndicator } from '@/components/common/StatusIndicator'
import { TextWrapper } from '@/components/common/TextWrapper'
import { CopyCell } from '@/components/data-table/columns/utils/ColumnCells'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { getDomainFromUrl } from '@/lib/utils/url-utils'
import type { Place } from '@ritchy/types'
import {
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Info,
  Languages,
  Loader2,
  MapPin,
  MapPinPlusInside,
  Phone,
  StarIcon,
  Store,
  Tags,
} from 'lucide-react'
import { useState } from 'react'

const PRICE_LEVELS = {
  PRICE_LEVEL_FREE: 'Free',
  PRICE_LEVEL_INEXPENSIVE: '$',
  PRICE_LEVEL_MODERATE: '$$',
  PRICE_LEVEL_EXPENSIVE: '$$$',
  PRICE_LEVEL_VERY_EXPENSIVE: '$$$$',
} as const

const STAR_KEYS = ['star-1', 'star-2', 'star-3', 'star-4', 'star-5'] as const

export const PlaceInfoTab = ({ place }: { place: Place }) => {
  const [isHoursOpen, setIsHoursOpen] = useState(false)
  const [showOriginal, setShowOriginal] = useState<Record<string, boolean>>({})
  const {
    data: reviewsData,
    isLoading: isLoadingReviews,
    error: reviewsError,
  } = usePlaceReviewsQuery(place.id)

  const toggleOriginalText = (reviewId: string) => {
    setShowOriginal((prev) => ({
      ...prev,
      [reviewId]: !prev[reviewId],
    }))
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="flex flex-col w-full">
          {/* Full Place Name */}
          <div className="flex items-center gap-3 mb-2">
            <Store className="h-5 w-5 text-muted-foreground shrink-0" />
            <TextWrapper
              id={place.id}
              actions={[
                {
                  icon: 'Copy',
                  onClick: () => {
                    navigator.clipboard.writeText(place.name)
                  },
                  label: 'Copy',
                },
              ]}
            >
              <span className="font-medium">{place.name}</span>
            </TextWrapper>
          </div>

          {/* Short Description */}
          {place.shortDescription && (
            <div className="flex items-center gap-3 mb-2">
              <Info className="h-5 w-5 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground">
                {place.shortDescription}
              </span>
            </div>
          )}

          {/* Rating information */}
          {place.rating && (
            <div className="flex items-center gap-3 mb-2">
              <StarIcon className="h-5 w-5 text-muted-foreground shrink-0" />
              <TextWrapper id={place.id}>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{place.rating.toFixed(1)}</span>
                  <div className="flex items-center gap-1">
                    {STAR_KEYS.map((key) => (
                      <StarIcon
                        key={key}
                        className={`h-3 w-3 ${
                          Number(key.split('-')[1]) <=
                          Math.round(place.rating ?? 0)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'fill-muted text-muted'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    ({place.ratingCount?.toLocaleString() ?? 0} reviews)
                  </span>
                </div>
              </TextWrapper>
            </div>
          )}

          {/* Opening hours section */}
          {place.openingHours && (
            <div className="flex flex-col gap-2 mb-2 cursor-pointer">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <Collapsible
                    open={isHoursOpen}
                    onOpenChange={setIsHoursOpen}
                    className="w-full"
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full flex items-center justify-between p-0 h-auto hover:bg-transparent"
                      >
                        <TextWrapper id={place.id}>
                          <span>
                            <StatusIndicator
                              isOpen={place.openingHours.openNow}
                            />
                          </span>
                        </TextWrapper>
                        {isHoursOpen ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2">
                      <OpeningHoursContent openingHours={place.openingHours} />
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </div>
            </div>
          )}

          {/* Address */}
          <div className="flex items-center gap-3 min-w-0 mb-2">
            <MapPin className="h-5 w-5 text-muted-foreground shrink-0" />
            <TextWrapper
              id={place.id}
              actions={[
                {
                  icon: 'Copy',
                  onClick: () => {
                    navigator.clipboard.writeText(
                      place.address?.formattedAddress ?? '',
                    )
                  },
                  label: 'Copy',
                },
              ]}
            >
              {place.address?.formattedAddress ?? 'Address not available'}
            </TextWrapper>
          </div>

          {/* Website */}
          {place.website && (
            <div className="flex items-center gap-3 mb-2">
              <ExternalLink className="h-5 w-5 text-muted-foreground shrink-0" />
              <TextWrapper
                id={place.id}
                actions={[
                  {
                    icon: 'Copy',
                    onClick: () => {
                      navigator.clipboard.writeText(String(place.website))
                    },
                    label: 'Copy',
                  },
                ]}
              >
                <a
                  href={place.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {getDomainFromUrl(place.website)}
                </a>
              </TextWrapper>
            </div>
          )}

          {/* Phone */}
          {place.phone && (
            <div className="flex items-center gap-3 mb-2">
              <Phone className="h-5 w-5 text-muted-foreground shrink-0" />
              <CopyCell content={place.phone} />
            </div>
          )}

          {/* Associated Lists */}
          {place.lists && place.lists.length > 0 && (
            <div className="flex items-center gap-3 mb-2">
              <MapPinPlusInside className="h-5 w-5 text-muted-foreground shrink-0" />
              <TextWrapper id={place.id}>
                <div className="flex flex-wrap gap-2 max-w-full">
                  {place.lists.map((list) => (
                    <Badge key={list.id} variant="secondary">
                      {list.emoji} {list.name}
                    </Badge>
                  ))}
                </div>
              </TextWrapper>
            </div>
          )}

          {/* Price Level */}
          {place.priceLevel && (
            <div className="flex items-center gap-3 mb-2">
              <Tags className="h-5 w-5 text-muted-foreground shrink-0" />
              <TextWrapper id={place.id}>
                <span className="text-sm">
                  {PRICE_LEVELS[place.priceLevel]}
                  <span className="text-muted-foreground"> · Price level</span>
                </span>
              </TextWrapper>
            </div>
          )}

          {/* Primary Type */}
          {place.primaryType && (
            <div className="flex items-center gap-3 mb-2">
              <Tags className="h-5 w-5 text-muted-foreground shrink-0" />
              <TextWrapper id={place.id}>
                <Badge variant="outline">{place.primaryType}</Badge>
              </TextWrapper>
            </div>
          )}

          {/* All Types/Tags */}
          {place.types && place.types.length > 0 && (
            <div className="flex items-center gap-3 mb-2">
              <Tags className="h-5 w-5 text-muted-foreground shrink-0" />
              <TextWrapper id={place.id}>
                <div className="flex flex-wrap gap-2 max-w-full">
                  {place.types.map((type) => (
                    <Badge key={type} variant="secondary">
                      {type}
                    </Badge>
                  ))}
                </div>
              </TextWrapper>
            </div>
          )}
        </div>

        {/* Reviews Section */}
        <div className="mt-6 pt-6 border-t">
          <h3 className="text-lg font-semibold mb-4">Reviews</h3>
          {isLoadingReviews ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : reviewsError ? (
            <div className="text-sm text-destructive">
              Error loading reviews: {reviewsError.message}
            </div>
          ) : reviewsData &&
            'reviews' in reviewsData &&
            reviewsData.reviews.length === 0 ? (
            <div className="flex items-center justify-center py-8 px-4">
              <div className="flex flex-col items-center text-center space-y-2 text-muted-foreground">
                <Info className="h-5 w-5" />
                <p className="text-sm">No reviews available for this place</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {reviewsData &&
                'reviews' in reviewsData &&
                reviewsData.reviews.map((review) => {
                  const reviewId = `${review.authorAttribution?.displayName}-${review.publishTime}`
                  const hasTranslation =
                    review.text?.text !== review.originalText?.text

                  return (
                    <div key={reviewId} className="rounded-lg border p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback>
                            {getInitials(
                              review.authorAttribution?.displayName ?? '',
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {review.authorAttribution?.displayName}
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

              {reviewsData &&
                'reviews' in reviewsData &&
                reviewsData.reviews.length === 5 && (
                  <div className="text-center pt-2 border-t">
                    <p className="text-sm text-muted-foreground mb-2">
                      Showing the {reviewsData.reviews.length} most relevant
                      reviews
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
          )}
        </div>
      </div>
    </div>
  )
}
