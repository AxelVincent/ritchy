import type { Place, PlacesSearchResponse } from '@ritchy/types'
import type {
  AdvancedPlace,
  GooglePlacesTextSearchResponse,
  PreferredPlace,
} from './types'

const objectMapper = (place: PreferredPlace) => ({
  id: place.id,
  websiteUri: place.websiteUri || '',
  displayName: place.displayName?.text || '',
  location: {
    latitude: place.location?.latitude || 0,
    longitude: place.location?.longitude || 0,
  },
  types: place.types || [],
  primaryType: place.primaryType,
  priceLevel: place.priceLevel,
  priceRange: place.priceRange,
  rating: place.rating,
  userRatingCount: place.userRatingCount,
  googleMapsUri: place.googleMapsUri || '',
  internationalPhoneNumber: place.internationalPhoneNumber,
  utcOffsetMinutes: place.utcOffsetMinutes || 0,
  regularOpeningHours: place.regularOpeningHours,
  editorialSummary: place.editorialSummary,
  addressComponents: place.addressComponents || [],
  address: {
    formattedAddress: place.formattedAddress || '',
    shortFormattedAddress: place.shortFormattedAddress || '',
    country:
      place.addressComponents?.find((component) =>
        component.types.includes('country'),
      )?.longText || '',
    locality:
      place.addressComponents?.find((component) =>
        component.types.includes('locality'),
      )?.longText || '',
    sublocality:
      place.addressComponents?.find((component) =>
        component.types.includes('sublocality'),
      )?.longText || '',
    postalCode:
      place.addressComponents?.find((component) =>
        component.types.includes('postal_code'),
      )?.longText || '',
    postalCodeSuffix:
      place.addressComponents?.find((component) =>
        component.types.includes('postal_code_suffix'),
      )?.longText || '',
    plusCode:
      place.addressComponents?.find((component) =>
        component.types.includes('plus_code'),
      )?.longText || '',
    street:
      place.addressComponents?.find((component) =>
        component.types.includes('route'),
      )?.longText || '',
    neighborhood:
      place.addressComponents?.find((component) =>
        component.types.includes('neighborhood'),
      )?.longText || '',
    administrativeAreaLevel1:
      place.addressComponents?.find((component) =>
        component.types.includes('administrative_area_level_1'),
      )?.longText || '',
    administrativeAreaLevel2:
      place.addressComponents?.find((component) =>
        component.types.includes('administrative_area_level_2'),
      )?.longText || '',
    administrativeAreaLevel3:
      place.addressComponents?.find((component) =>
        component.types.includes('administrative_area_level_3'),
      )?.longText || '',
  },
})

export function mapToPlacesSearchResult(
  response: GooglePlacesTextSearchResponse,
): PlacesSearchResponse {
  if (!response.places) return []

  return response.places.map(objectMapper)
}

export function mapToPlaceDetails(place: AdvancedPlace): Place {
  return objectMapper(place)
}
