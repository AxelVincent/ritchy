import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ExternalLink, Languages } from 'lucide-react'
import { useState } from 'react'
import { StarRating } from './StarRating'

interface ReviewCardProps {
  review: {
    name?: string
    rating: number
    publishTime?: string
    googleMapsUri?: string
    text?: { text?: string }
    originalText?: { text?: string }
    authorAttribution?: {
      displayName?: string
      uri?: string
      photoUri?: string
    }
  }
  showTranslationToggle?: boolean
}

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export const ReviewCard = ({
  review,
  showTranslationToggle = true,
}: ReviewCardProps) => {
  const [showOriginal, setShowOriginal] = useState(false)
  const hasTranslation = review.text?.text !== review.originalText?.text

  const displayText = showOriginal
    ? review.originalText?.text
    : review.text?.text

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Avatar className="w-8 h-8">
            {review.authorAttribution?.photoUri && (
              <AvatarImage
                src={review.authorAttribution.photoUri}
                alt={review.authorAttribution.displayName || 'Reviewer'}
              />
            )}
            <AvatarFallback>
              {getInitials(review.authorAttribution?.displayName || 'AN')}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">
              {review.authorAttribution?.displayName || 'Anonymous'}
            </p>
            <StarRating rating={review.rating} size="sm" />
          </div>
        </div>
        {review.publishTime && (
          <span className="text-xs text-muted-foreground">
            {new Date(review.publishTime).toLocaleDateString()}
          </span>
        )}
      </div>

      {displayText && (
        <p className="mt-3 text-sm text-muted-foreground">{displayText}</p>
      )}

      <div className="flex items-center gap-2 mt-2">
        {showTranslationToggle && hasTranslation && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setShowOriginal(!showOriginal)}
          >
            <Languages className="mr-1 h-3 w-3" />
            {showOriginal ? 'Show translation' : 'Show original'}
          </Button>
        )}

        {review.googleMapsUri && (
          <a
            href={review.googleMapsUri}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
          >
            View on Google Maps
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  )
}
