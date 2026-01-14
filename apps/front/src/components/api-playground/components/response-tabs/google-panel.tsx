import {
  BooleanFeatureGrid,
  ReviewCard,
  StarRating,
} from '@/components/enrichment'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Separator } from '@/components/ui/separator'
import type { ApiV1CompanyEnrichmentSuccessResponse } from '@api/routes_api/v1/enrich/contract'
import {
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  MapPin,
  Settings,
  Star,
  Tag,
} from 'lucide-react'
import { useState } from 'react'
import { InfoRow } from './shared'

interface GooglePanelProps {
  response: ApiV1CompanyEnrichmentSuccessResponse
}

const formatOpeningHours = (
  hours: { weekdayDescriptions?: string[] } | undefined,
) => {
  if (!hours?.weekdayDescriptions) return null
  return hours.weekdayDescriptions
}

// Helper function to convert price level to number
const getPriceLevelNumber = (priceLevel: string | undefined): number => {
  if (!priceLevel) return 0
  switch (priceLevel) {
    case 'PRICE_LEVEL_FREE':
      return 0
    case 'PRICE_LEVEL_INEXPENSIVE':
      return 1
    case 'PRICE_LEVEL_MODERATE':
      return 2
    case 'PRICE_LEVEL_EXPENSIVE':
      return 3
    case 'PRICE_LEVEL_VERY_EXPENSIVE':
      return 4
    default:
      return 0
  }
}

export const GooglePanel = ({ response }: GooglePanelProps) => {
  const { data } = response
  const googlePlace = data.googlePlace

  const [isTypesOpen, setIsTypesOpen] = useState(false)
  const [isAddressOpen, setIsAddressOpen] = useState(false)
  const [isHoursOpen, setIsHoursOpen] = useState(true)
  const [isReviewsOpen, setIsReviewsOpen] = useState(true)
  const [isServicesOpen, setIsServicesOpen] = useState(true)
  const [isAmenitiesOpen, setIsAmenitiesOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isAccessibilityOpen, setIsAccessibilityOpen] = useState(false)
  const [isParkingOpen, setIsParkingOpen] = useState(false)
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)

  if (!googlePlace) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground">
        No Google Place data available
      </div>
    )
  }

  const openingHours = formatOpeningHours(googlePlace.regularOpeningHours)
  const reviews = googlePlace.reviews ?? []
  const types = googlePlace.types ?? []
  const addressComponents = googlePlace.addressComponents ?? []

  // Group boolean features
  const serviceFeatures = [
    { key: 'delivery', label: 'Delivery', value: googlePlace.delivery },
    { key: 'takeout', label: 'Takeout', value: googlePlace.takeout },
    { key: 'dineIn', label: 'Dine-in', value: googlePlace.dineIn },
    {
      key: 'curbsidePickup',
      label: 'Curbside Pickup',
      value: googlePlace.curbsidePickup,
    },
    { key: 'reservable', label: 'Reservable', value: googlePlace.reservable },
  ].filter((f) => f.value !== undefined)

  const amenityFeatures = [
    {
      key: 'outdoorSeating',
      label: 'Outdoor Seating',
      value: googlePlace.outdoorSeating,
    },
    { key: 'restroom', label: 'Restroom', value: googlePlace.restroom },
    { key: 'liveMusic', label: 'Live Music', value: googlePlace.liveMusic },
    { key: 'allowsDogs', label: 'Allows Dogs', value: googlePlace.allowsDogs },
    {
      key: 'goodForChildren',
      label: 'Good for Children',
      value: googlePlace.goodForChildren,
    },
    {
      key: 'goodForGroups',
      label: 'Good for Groups',
      value: googlePlace.goodForGroups,
    },
    {
      key: 'goodForWatchingSports',
      label: 'Good for Watching Sports',
      value: googlePlace.goodForWatchingSports,
    },
    {
      key: 'menuForChildren',
      label: 'Menu for Children',
      value: googlePlace.menuForChildren,
    },
  ].filter((f) => f.value !== undefined)

  const servesFeatures = [
    {
      key: 'servesBreakfast',
      label: 'Breakfast',
      value: googlePlace.servesBreakfast,
    },
    { key: 'servesBrunch', label: 'Brunch', value: googlePlace.servesBrunch },
    { key: 'servesLunch', label: 'Lunch', value: googlePlace.servesLunch },
    { key: 'servesDinner', label: 'Dinner', value: googlePlace.servesDinner },
    { key: 'servesCoffee', label: 'Coffee', value: googlePlace.servesCoffee },
    {
      key: 'servesDessert',
      label: 'Dessert',
      value: googlePlace.servesDessert,
    },
    { key: 'servesBeer', label: 'Beer', value: googlePlace.servesBeer },
    { key: 'servesWine', label: 'Wine', value: googlePlace.servesWine },
    {
      key: 'servesCocktails',
      label: 'Cocktails',
      value: googlePlace.servesCocktails,
    },
    {
      key: 'servesVegetarianFood',
      label: 'Vegetarian Food',
      value: googlePlace.servesVegetarianFood,
    },
  ].filter((f) => f.value !== undefined)

  const accessibilityFeatures = googlePlace.accessibilityOptions
    ? [
        {
          key: 'wheelchairEntrance',
          label: 'Wheelchair Entrance',
          value: googlePlace.accessibilityOptions.wheelchairAccessibleEntrance,
        },
        {
          key: 'wheelchairParking',
          label: 'Wheelchair Parking',
          value: googlePlace.accessibilityOptions.wheelchairAccessibleParking,
        },
        {
          key: 'wheelchairRestroom',
          label: 'Wheelchair Restroom',
          value: googlePlace.accessibilityOptions.wheelchairAccessibleRestroom,
        },
        {
          key: 'wheelchairSeating',
          label: 'Wheelchair Seating',
          value: googlePlace.accessibilityOptions.wheelchairAccessibleSeating,
        },
      ].filter((f) => f.value !== undefined)
    : []

  const parkingFeatures = googlePlace.parkingOptions
    ? [
        {
          key: 'freeParkingLot',
          label: 'Free Parking Lot',
          value: googlePlace.parkingOptions.freeParkingLot,
        },
        {
          key: 'paidParkingLot',
          label: 'Paid Parking Lot',
          value: googlePlace.parkingOptions.paidParkingLot,
        },
        {
          key: 'freeStreetParking',
          label: 'Free Street Parking',
          value: googlePlace.parkingOptions.freeStreetParking,
        },
        {
          key: 'paidStreetParking',
          label: 'Paid Street Parking',
          value: googlePlace.parkingOptions.paidStreetParking,
        },
        {
          key: 'freeGarageParking',
          label: 'Free Garage Parking',
          value: googlePlace.parkingOptions.freeGarageParking,
        },
        {
          key: 'paidGarageParking',
          label: 'Paid Garage Parking',
          value: googlePlace.parkingOptions.paidGarageParking,
        },
        {
          key: 'valetParking',
          label: 'Valet Parking',
          value: googlePlace.parkingOptions.valetParking,
        },
      ].filter((f) => f.value !== undefined)
    : []

  const paymentFeatures = googlePlace.paymentOptions
    ? [
        {
          key: 'creditCards',
          label: 'Credit Cards',
          value: googlePlace.paymentOptions.acceptsCreditCards,
        },
        {
          key: 'debitCards',
          label: 'Debit Cards',
          value: googlePlace.paymentOptions.acceptsDebitCards,
        },
        {
          key: 'nfc',
          label: 'NFC/Contactless',
          value: googlePlace.paymentOptions.acceptsNfc,
        },
        {
          key: 'cashOnly',
          label: 'Cash Only',
          value: googlePlace.paymentOptions.acceptsCashOnly,
        },
      ].filter((f) => f.value !== undefined)
    : []

  const hasFeatures =
    serviceFeatures.length > 0 ||
    amenityFeatures.length > 0 ||
    servesFeatures.length > 0 ||
    accessibilityFeatures.length > 0 ||
    parkingFeatures.length > 0 ||
    paymentFeatures.length > 0

  const hasLocationInfo =
    openingHours || addressComponents.length > 0 || googlePlace.googleMapsLinks

  return (
    <div className="space-y-4">
      {/* Card 1: Place Overview */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Place Details
            </CardTitle>
            {googlePlace.businessStatus && (
              <Badge
                variant={
                  googlePlace.businessStatus === 'OPERATIONAL'
                    ? 'default'
                    : 'secondary'
                }
              >
                {googlePlace.businessStatus.replace(/_/g, ' ')}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Basic Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <InfoRow label="Place ID" value={googlePlace.id} mono icon={Tag} />
            <InfoRow
              label="Primary Type"
              value={googlePlace.primaryTypeDisplayName?.text}
            />
            <InfoRow
              label="Phone"
              value={googlePlace.internationalPhoneNumber}
            />
            {googlePlace.utcOffsetMinutes !== undefined && (
              <InfoRow
                label="UTC Offset"
                value={`${googlePlace.utcOffsetMinutes} minutes`}
              />
            )}
            {googlePlace.priceLevel && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Price Level
                </p>
                <div className="flex items-center gap-1">
                  {['price-1', 'price-2', 'price-3', 'price-4'].map(
                    (key, i) => (
                      <span
                        key={key}
                        className={`text-sm ${
                          i < getPriceLevelNumber(googlePlace.priceLevel)
                            ? 'text-green-600 font-medium'
                            : 'text-muted-foreground/30'
                        }`}
                      >
                        $
                      </span>
                    ),
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Rating Inline */}
          {(googlePlace.rating || googlePlace.userRatingCount) && (
            <>
              <Separator />
              <div className="flex items-center gap-4">
                {googlePlace.rating && (
                  <StarRating
                    rating={googlePlace.rating}
                    showValue
                    reviewCount={googlePlace.userRatingCount ?? undefined}
                  />
                )}
              </div>
              {googlePlace.editorialSummary && (
                <p className="text-sm text-muted-foreground italic">
                  "{googlePlace.editorialSummary.text}"
                </p>
              )}
            </>
          )}

          {/* Types - Collapsible */}
          {types.length > 0 && (
            <>
              <Separator />
              <Collapsible open={isTypesOpen} onOpenChange={setIsTypesOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium hover:text-foreground text-muted-foreground py-1">
                  <span className="flex items-center gap-2">
                    <Tag className="h-3.5 w-3.5" />
                    Place Types
                    <Badge variant="outline" className="text-xs">
                      {types.length}
                    </Badge>
                  </span>
                  {isTypesOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <div className="flex flex-wrap gap-2">
                    {types.map((type) => (
                      <Badge key={type} variant="secondary" className="text-xs">
                        {type.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </>
          )}
        </CardContent>
      </Card>

      {/* Card 2: Hours & Location */}
      {hasLocationInfo && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Hours & Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Opening Hours */}
            {openingHours && (
              <Collapsible open={isHoursOpen} onOpenChange={setIsHoursOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium hover:text-foreground text-muted-foreground py-1">
                  <span className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" />
                    Opening Hours
                  </span>
                  {isHoursOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <div className="space-y-1 pl-5">
                    {openingHours.map((day) => (
                      <p key={day} className="text-sm text-muted-foreground">
                        {day}
                      </p>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Address Components */}
            {addressComponents.length > 0 && (
              <>
                {openingHours && <Separator />}
                <Collapsible
                  open={isAddressOpen}
                  onOpenChange={setIsAddressOpen}
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium hover:text-foreground text-muted-foreground py-1">
                    <span className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5" />
                      Address Components
                      <Badge variant="outline" className="text-xs">
                        {addressComponents.length}
                      </Badge>
                    </span>
                    {isAddressOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2">
                    <div className="space-y-2 pl-5">
                      {addressComponents.map((component, index) => (
                        <div
                          key={`addr-${component.longText}-${index}`}
                          className="flex items-center justify-between py-1 border-b last:border-0"
                        >
                          <span className="text-sm">{component.longText}</span>
                          <div className="flex gap-1">
                            {component.types?.map((type) => (
                              <Badge
                                key={`${component.longText}-${type}`}
                                variant="outline"
                                className="text-xs"
                              >
                                {type.replace(/_/g, ' ')}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </>
            )}

            {/* Google Maps Links */}
            {googlePlace.googleMapsLinks && (
              <>
                {(openingHours || addressComponents.length > 0) && (
                  <Separator />
                )}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Quick Links
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {googlePlace.googleMapsLinks.placeUri && (
                      <a
                        href={googlePlace.googleMapsLinks.placeUri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-muted hover:bg-muted/80 rounded-md transition-colors"
                      >
                        View on Maps
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {googlePlace.googleMapsLinks.directionsUri && (
                      <a
                        href={googlePlace.googleMapsLinks.directionsUri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-muted hover:bg-muted/80 rounded-md transition-colors"
                      >
                        Directions
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {googlePlace.googleMapsLinks.reviewsUri && (
                      <a
                        href={googlePlace.googleMapsLinks.reviewsUri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-muted hover:bg-muted/80 rounded-md transition-colors"
                      >
                        All Reviews
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {googlePlace.googleMapsLinks.photosUri && (
                      <a
                        href={googlePlace.googleMapsLinks.photosUri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-muted hover:bg-muted/80 rounded-md transition-colors"
                      >
                        Photos
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Card 3: Reviews */}
      {reviews.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="h-4 w-4" />
              Reviews
              <Badge variant="secondary" className="ml-1">
                {reviews.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Collapsible open={isReviewsOpen} onOpenChange={setIsReviewsOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium hover:text-foreground text-muted-foreground py-1">
                <span>Top Reviews</span>
                {isReviewsOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="space-y-3">
                  {reviews.map((review, index) => (
                    <ReviewCard
                      key={review.name || `review-${index}`}
                      review={review}
                      showTranslationToggle
                    />
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      )}

      {/* Card 4: Features & Amenities */}
      {hasFeatures && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Features & Amenities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Service Options */}
            {serviceFeatures.length > 0 && (
              <Collapsible
                open={isServicesOpen}
                onOpenChange={setIsServicesOpen}
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium hover:text-foreground text-muted-foreground py-1">
                  <span>Service Options</span>
                  {isServicesOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <BooleanFeatureGrid features={serviceFeatures} />
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Amenities */}
            {amenityFeatures.length > 0 && (
              <>
                {serviceFeatures.length > 0 && <Separator />}
                <Collapsible
                  open={isAmenitiesOpen}
                  onOpenChange={setIsAmenitiesOpen}
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium hover:text-foreground text-muted-foreground py-1">
                    <span>Amenities</span>
                    {isAmenitiesOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2">
                    <BooleanFeatureGrid features={amenityFeatures} />
                  </CollapsibleContent>
                </Collapsible>
              </>
            )}

            {/* Menu Options */}
            {servesFeatures.length > 0 && (
              <>
                {(serviceFeatures.length > 0 || amenityFeatures.length > 0) && (
                  <Separator />
                )}
                <Collapsible open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium hover:text-foreground text-muted-foreground py-1">
                    <span>Menu Options</span>
                    {isMenuOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2">
                    <BooleanFeatureGrid features={servesFeatures} />
                  </CollapsibleContent>
                </Collapsible>
              </>
            )}

            {/* Accessibility */}
            {accessibilityFeatures.length > 0 && (
              <>
                <Separator />
                <Collapsible
                  open={isAccessibilityOpen}
                  onOpenChange={setIsAccessibilityOpen}
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium hover:text-foreground text-muted-foreground py-1">
                    <span>Accessibility</span>
                    {isAccessibilityOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2">
                    <BooleanFeatureGrid features={accessibilityFeatures} />
                  </CollapsibleContent>
                </Collapsible>
              </>
            )}

            {/* Parking */}
            {parkingFeatures.length > 0 && (
              <>
                <Separator />
                <Collapsible
                  open={isParkingOpen}
                  onOpenChange={setIsParkingOpen}
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium hover:text-foreground text-muted-foreground py-1">
                    <span>Parking</span>
                    {isParkingOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2">
                    <BooleanFeatureGrid features={parkingFeatures} />
                  </CollapsibleContent>
                </Collapsible>
              </>
            )}

            {/* Payment Options */}
            {paymentFeatures.length > 0 && (
              <>
                <Separator />
                <Collapsible
                  open={isPaymentOpen}
                  onOpenChange={setIsPaymentOpen}
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium hover:text-foreground text-muted-foreground py-1">
                    <span>Payment Options</span>
                    {isPaymentOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2">
                    <BooleanFeatureGrid features={paymentFeatures} />
                  </CollapsibleContent>
                </Collapsible>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
