import { StatusIndicator } from '@/components/common/StatusIndicator'
import { TextWrapper } from '@/components/common/TextWrapper'
import { PhoneCell } from '@/components/data-table/columns/utils/ColumnCells'
import { Badge } from '@/components/ui/badge'
import type { Place } from '@ritchy/types'
import {
  Clock,
  ExternalLink,
  MapPin,
  MapPinPlusInside,
  Phone,
  Store,
  Tags,
} from 'lucide-react'

const PRICE_LEVELS = {
  PRICE_LEVEL_FREE: 'Free',
  PRICE_LEVEL_INEXPENSIVE: '$',
  PRICE_LEVEL_MODERATE: '$$',
  PRICE_LEVEL_EXPENSIVE: '$$$',
  PRICE_LEVEL_VERY_EXPENSIVE: '$$$$',
} as const

export const PlaceInfoTab = ({ place }: { place: Place }) => (
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

        {/* Opening hours status */}
        {place.openingHours && (
          <div className="flex items-center gap-3 mb-2">
            <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="flex items-center gap-2">
              <TextWrapper id={place.id}>
                <span>
                  <StatusIndicator isOpen={place.openingHours.openNow} />
                </span>
              </TextWrapper>
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
              {new URL(place.website).hostname}
            </TextWrapper>
          </div>
        )}

        {/* Phone */}
        {place.phone && (
          <div className="flex items-center gap-3 mb-2">
            <Phone className="h-5 w-5 text-muted-foreground shrink-0" />
            <PhoneCell id={place.id} content={place.phone} />
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
    </div>
  </div>
)
