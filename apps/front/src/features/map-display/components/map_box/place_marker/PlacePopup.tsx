import { OpeningHoursContent } from '@/components/common/OpeningHours'
import { StatusIndicator } from '@/components/common/StatusIndicator'
import { TextWrapper } from '@/components/common/TextWrapper'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Notes } from '@/features/places/Notes'
import type { Place } from '@ritchy/types'
import {
  ExternalLink,
  MapPin,
  MapPinPlusInside,
  Phone,
  Star,
  Tags,
} from 'lucide-react'

const PRICE_LEVELS = {
  PRICE_LEVEL_FREE: 'Free',
  PRICE_LEVEL_INEXPENSIVE: '$',
  PRICE_LEVEL_MODERATE: '$$',
  PRICE_LEVEL_EXPENSIVE: '$$$',
  PRICE_LEVEL_VERY_EXPENSIVE: '$$$$',
} as const

interface PlacePopupProps {
  place: Place
}

const PlaceInfoTab = ({ place }: { place: Place }) => (
  <div className="h-full flex flex-col">
    {/* Scrollable content area */}
    <div className="flex-1 overflow-y-auto overflow-x-hidden">
      <div className="flex flex-col w-[260px]">
        {/* Address */}
        <div className="flex items-center gap-3 min-w-0 ">
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
          <div className="flex items-center gap-3">
            <ExternalLink className="h-5 w-5 text-muted-foreground shrink-0" />
            <TextWrapper
              id={place.id}
              actions={[
                {
                  icon: 'Copy',
                  onClick: () => {
                    navigator.clipboard.writeText(place.website)
                  },
                  label: 'Copy',
                },
              ]}
            >
              {new URL(place.website).hostname}
            </TextWrapper>
          </div>
        )}

        {/* Phone */}
        {place.phone && (
          <div className="flex items-center gap-3">
            <Phone className="h-5 w-5 text-muted-foreground shrink-0" />
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
              {place.phone}
            </TextWrapper>
          </div>
        )}

        {/* Associated Lists */}
        {place.lists && place.lists.length > 0 && (
          <div className="flex items-center gap-3">
            <MapPinPlusInside className="h-5 w-5 text-muted-foreground shrink-0" />
            <TextWrapper id={place.id}>
              <div className="flex flex-wrap gap-2 max-w-[250px]">
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
          <div className="flex items-center gap-3">
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
          <div className="flex items-center gap-3">
            <Tags className="h-5 w-5 text-muted-foreground shrink-0" />
            <TextWrapper id={place.id}>
              <Badge variant="outline">{place.primaryType}</Badge>
            </TextWrapper>
          </div>
        )}

        {/* All Types/Tags */}
        {place.types && place.types.length > 0 && (
          <div className="flex items-center gap-3">
            <Tags className="h-5 w-5 text-muted-foreground shrink-0" />
            <TextWrapper id={place.id}>
              <div className="flex flex-wrap gap-2 max-w-[250px]">
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
    </div>

    {/* Fixed action buttons */}
    <div className="flex flex-col gap-2 pt-4 max-w-[320px]">
      <div className="flex gap-2">
        {place.googleMapsUri && (
          <Button className="flex-1" variant="default" asChild>
            <a
              href={place.googleMapsUri}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2"
            >
              <MapPin className="h-4 w-4" />
              Directions
            </a>
          </Button>
        )}
        {place.website && (
          <Button className="flex-1" variant="outline" asChild>
            <a
              href={place.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Website
            </a>
          </Button>
        )}
      </div>
    </div>
  </div>
)

const PlaceHoursTab = ({ place }: { place: Place }) => {
  return (
    <div className="h-full overflow-auto">
      {place.openingHours ? (
        <div className="flex flex-col">
          <OpeningHoursContent openingHours={place.openingHours} />
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="text-sm text-muted-foreground">
            No opening hours available
          </div>
        </div>
      )}
    </div>
  )
}

const PlaceNotesTab = ({ place }: { place: Place }) => (
  <div className="h-full">
    <Notes
      placeId={place.id}
      onNoteAdded={(note) => {
        // Update the place's notes array directly
        place.notes = [note, ...(place.notes || [])]
      }}
    />
  </div>
)

export const PlacePopup = ({ place }: PlacePopupProps) => {
  return (
    <Card className="h-[350px] w-[320px] flex flex-col overflow-hidden">
      <CardHeader className="pb-2">
        {/* Main Title */}
        <CardTitle className="flex flex-col gap-2">
          <div className="text-lg font-semibold">{place.name}</div>
          <div className="flex items-center gap-2 text-sm">
            {place.rating ? (
              <div className="flex items-center gap-1">
                <span className="font-medium">{place.rating.toFixed(1)}</span>
                <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                <span className="text-muted-foreground">
                  ({place.ratingCount?.toLocaleString() ?? 0})
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-muted-foreground">
                No reviews
              </div>
            )}
            {place.openingHours && (
              <StatusIndicator isOpen={place.openingHours.openNow} />
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <Tabs defaultValue="info" className="flex flex-col h-full">
          <TabsList
            className="p-0 grid grid-cols-3 h-[45px] shrink-0 items-center bg-transparent"
            aria-label="Place details"
          >
            <TabsTrigger
              value="info"
              aria-label="Information"
              className="relative flex-1 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground data-[state=active]:text-foreground data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:h-0.5 data-[state=active]:after:w-full data-[state=active]:after:bg-primary focus-visible:ring-0 !shadow-none"
            >
              Information
            </TabsTrigger>
            <TabsTrigger
              value="hours"
              aria-label="Opening hours"
              className="relative flex-1 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground data-[state=active]:text-foreground data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:h-0.5 data-[state=active]:after:w-full data-[state=active]:after:bg-primary focus-visible:ring-0 !shadow-none"
            >
              Opening hours
            </TabsTrigger>
            <TabsTrigger
              value="notes"
              aria-label="Notes"
              className="relative flex-1 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground data-[state=active]:text-foreground data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:h-0.5 data-[state=active]:after:w-full data-[state=active]:after:bg-primary focus-visible:ring-0 !shadow-none"
            >
              Notes
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden flex flex-col">
            <TabsContent
              value="info"
              className="mt-0 p-4 h-full flex-1 overflow-auto"
            >
              <PlaceInfoTab place={place} />
            </TabsContent>

            <TabsContent
              value="hours"
              className="mt-0 px-4 h-full flex-1 overflow-auto"
            >
              <PlaceHoursTab place={place} />
            </TabsContent>

            <TabsContent
              value="notes"
              className="mt-0 px-4 h-full data-[state=active]:flex data-[state=active]:flex-col"
            >
              <PlaceNotesTab place={place} />
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  )
}
