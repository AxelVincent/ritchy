import { TextWrapper } from '@/components/common/TextWrapper'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { OpeningHoursContent } from '@/features/MapDisplay/components/shared/OpeningHours'
import { StatusIndicator } from '@/features/MapDisplay/components/shared/StatusIndicator'
import { formatUtcOffset } from '@/lib/formatUtcOffset'
import { cn } from '@/lib/utils'
import type { Place } from '@ritchy/types'
import { ExternalLink } from 'lucide-react'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

interface PlacePopupProps {
  place: Place
}

export const PlacePopup = ({ place }: PlacePopupProps) => {
  const [showHours, setShowHours] = useState(false)

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
            width="100%"
          >
            {place.shortFormattedAddress}
          </TextWrapper>
        )}

        {place.internationalPhoneNumber && (
          <TextWrapper copyValue={place.internationalPhoneNumber}>
            {place.internationalPhoneNumber}
          </TextWrapper>
        )}

        {place.regularOpeningHours && (
          <div className="flex flex-col w-full gap-1">
            <div className="flex items-center gap-2">
              <StatusIndicator isOpen={place.regularOpeningHours.openNow} />
              <span className="text-xs text-muted-foreground">
                {formatUtcOffset(place.utcOffsetMinutes)}
              </span>
              {place.regularOpeningHours && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-6 p-1"
                  onClick={() => setShowHours(!showHours)}
                >
                  <ChevronDown
                    className={cn('h-4 w-4 transition-transform', {
                      'rotate-180': showHours,
                    })}
                  />
                </Button>
              )}
            </div>

            {showHours && (
              <OpeningHoursContent
                regularOpeningHours={place.regularOpeningHours}
              />
            )}
          </div>
        )}

        {place.websiteUri && (
          <Button variant="link" className="h-auto p-0" asChild>
            <a
              href={place.websiteUri}
              target="_blank"
              rel="noreferrer"
              className="flex items-center"
            >
              Visit Website
              <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </Button>
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

        {place.editorialSummary && (
          <p className="text-sm text-muted-foreground">
            {place.editorialSummary.text}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
