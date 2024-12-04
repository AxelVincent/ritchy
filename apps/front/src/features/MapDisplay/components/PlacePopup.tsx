import { TextWrapper } from '@/components/common/TextWrapper'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Place } from '@ritchy/types'
import { ExternalLink } from 'lucide-react'

interface PlacePopupProps {
  place: Place
}

export const PlacePopup = ({ place }: PlacePopupProps) => {
  return (
    <Card className="w-[300px] overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{place.displayName}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-start gap-2 space-y-1">
        {place.rating && (
          <div className="flex items-center gap-1">
            <span className="text-yellow-500">★</span>
            <span>{place.rating.toFixed(1)}</span>
            {place.userRatingCount && (
              <span className="text-muted-foreground">
                ({place.userRatingCount} reviews)
              </span>
            )}
          </div>
        )}

        {place.shortFormattedAddress && (
          <TextWrapper
            copyValue={place.shortFormattedAddress}
            truncate
            maxWidth="100%"
          >
            {place.shortFormattedAddress}
          </TextWrapper>
          // <CopyText
          //   text={place.shortFormattedAddress}
          //   className="text-sm text-muted-foreground"
          // />
        )}

        {place.currentOpeningHours && (
          <Badge
            className={
              place.currentOpeningHours.openNow
                ? 'bg-green-500 text-white'
                : 'bg-red-500 text-white'
            }
          >
            {place.currentOpeningHours.openNow ? 'Open now' : 'Closed'}
          </Badge>
        )}

        <Button variant="link" className="h-auto p-0" asChild>
          <a
            href={place.googleMapsUri}
            target="_blank"
            rel="noreferrer"
            className="flex items-center"
          >
            View on Google Maps
            <ExternalLink className="ml-1 h-3 w-3" />
          </a>
        </Button>
      </CardContent>
    </Card>
  )
}
