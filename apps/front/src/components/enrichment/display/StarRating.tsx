import { Star } from 'lucide-react'

interface StarRatingProps {
  rating: number
  maxStars?: number
  size?: 'sm' | 'md' | 'lg'
  showValue?: boolean
  reviewCount?: number
}

const sizeClasses = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
}

const valueSizeClasses = {
  sm: 'text-sm',
  md: 'text-lg',
  lg: 'text-xl',
}

export const StarRating = ({
  rating,
  maxStars = 5,
  size = 'md',
  showValue = false,
  reviewCount,
}: StarRatingProps) => {
  const stars = Array.from({ length: maxStars }, (_, i) => i + 1)

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5">
        {stars.map((star) => (
          <Star
            key={star}
            className={`${sizeClasses[size]} ${
              star <= Math.round(rating)
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
      {showValue && (
        <span className={`font-semibold ${valueSizeClasses[size]}`}>
          {rating.toFixed(1)}
        </span>
      )}
      {reviewCount !== undefined && (
        <span className="text-sm text-muted-foreground">
          ({reviewCount.toLocaleString()} reviews)
        </span>
      )}
    </div>
  )
}
