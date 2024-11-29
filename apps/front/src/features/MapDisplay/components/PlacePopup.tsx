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
    <Card className="w-[300px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{place.displayName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {place.rating && (
          <div className="flex items-center gap-1.5">
            <Badge variant="secondary">
              ⭐ {place.rating.toFixed(1)}
              {place.userRatingCount
                ? ` (${place.userRatingCount} reviews)`
                : ''}
            </Badge>
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          {place.shortFormattedAddress}
        </p>

        {place.currentOpeningHours && (
          <Badge
            variant={
              place.currentOpeningHours.openNow ? 'secondary' : 'destructive'
            }
          >
            {place.currentOpeningHours.openNow ? 'Open now' : 'Closed'}
          </Badge>
        )}

        <Button variant="link" className="h-auto p-0" asChild>
          <a
            href={place.googleMapsUri}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5"
          >
            View on Google Maps
            <ExternalLink className="h-3 w-3" />
          </a>
        </Button>
      </CardContent>
    </Card>
  )
}
