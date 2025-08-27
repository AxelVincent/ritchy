import type { PlaceBase } from '@ritchy/types'
import type { Place } from '../../../db/schema/place'
import type { GooglePlacesTextSearchResponse, PreferredPlace } from './../types'

const objectMapper = (place: Omit<Place, 'id'>): Omit<PlaceBase, 'id'> => {
  return {
    sourceId: place.sourceId,
    website: place.website || '',
    name: place.name || '',
    location: {
      latitude: place.location?.latitude || 0,
      longitude: place.location?.longitude || 0,
    },
    types: place.types || [],
    primaryType: place.primaryType || undefined,
    priceLevel: place.priceLevel || undefined,
    priceRange: place.priceRange || undefined,
    rating: place.rating || undefined,
    ratingCount: place.ratingCount || undefined,
    googleMapsUri: place.sourceUrl || '',
    phone: place.phone || undefined,
    utcOffsetMinutes: place.utcOffsetMinutes || 0,
    openingHours: place.openingHours || undefined,
    isDeleted: place.isDeleted,
    address: {
      formattedAddress: place.formattedAddress || '',
      shortFormattedAddress: place.shortFormattedAddress || '',
      country: place.country || '',
      locality: place.locality || '',
      sublocality: place.sublocality || '',
      postalCode: place.postalCode || '',
      postalCodeSuffix: place.postalCodeSuffix || '',
      plusCode: place.plusCode || '',
      street: place.street || '',
      streetNumber: place.streetNumber || '',
      neighborhood: place.neighborhood || '',
      administrativeAreaLevel1: place.administrativeAreaLevel1 || '',
      administrativeAreaLevel2: place.administrativeAreaLevel2 || '',
      administrativeAreaLevel3: place.administrativeAreaLevel3 || '',
    },
  }
}

export function mapToPlacesSearchResult(
  response: Place,
): Omit<PlaceBase, 'id'>[] {
  return [objectMapper(response)]
}

export function mapToPlaceDetails(place: Place): Omit<PlaceBase, 'id'> {
  return objectMapper(place)
}
