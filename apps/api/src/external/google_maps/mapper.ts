import type { Place, PlacesSearchResponse } from '@ritchy/types'
import type { AdvancedPlace, GooglePlacesTextSearchResponse } from './types'

export function mapToPlacesSearchResult(
  response: GooglePlacesTextSearchResponse,
): PlacesSearchResponse {
  if (!response.places) return []

  return response.places.map((place) => ({
    id: place.id,
    websiteUri: place.websiteUri || '',
    displayName: place.displayName?.text || '',
    location: {
      latitude: place.location?.latitude || 0,
      longitude: place.location?.longitude || 0,
    },
    types: place.types || [],
    formattedAddress: place.formattedAddress || '',
    rating: place.rating,
    userRatingCount: place.userRatingCount,
    shortFormattedAddress: place.shortFormattedAddress,
    googleMapsUri: place.googleMapsUri || '',
    internationalPhoneNumber: place.internationalPhoneNumber,
    utcOffsetMinutes: place.utcOffsetMinutes || 0,
    regularOpeningHours: place.regularOpeningHours,
  }))
}

export function mapToPlaceDetails(place: AdvancedPlace): Place {
  return {
    id: place.id,
    websiteUri: place.websiteUri || '',
    displayName: place.displayName?.text || '',
    location: {
      latitude: place.location?.latitude || 0,
      longitude: place.location?.longitude || 0,
    },
    types: place.types || [],
    formattedAddress: place.formattedAddress || '',
    rating: place.rating,
    userRatingCount: place.userRatingCount,
    shortFormattedAddress: place.shortFormattedAddress,
    googleMapsUri: place.googleMapsUri || '',
    internationalPhoneNumber: place.internationalPhoneNumber,
    utcOffsetMinutes: place.utcOffsetMinutes || 0,
    regularOpeningHours: place.regularOpeningHours,
  }
}
