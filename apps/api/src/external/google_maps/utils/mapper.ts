import type { PlaceBase } from '@ritchy/types'
import type { Place } from '../../../db/schema/place'
import type { GooglePlacesTextSearchResponse, PreferredPlace } from './../types'

const objectMapper = (
  place: Omit<Place, 'id' | 'reviews'>,
): Omit<PlaceBase, 'id'> => {
  return {
    sourceId: place.source_id,
    website: place.website || '',
    name: place.name || '',
    location: {
      latitude: place.location?.latitude || 0,
      longitude: place.location?.longitude || 0,
    },
    types: place.types || [],
    primaryType: place.primary_type || undefined,
    priceLevel: place.price_level || undefined,
    priceRange: place.price_range || undefined,
    rating: place.rating || undefined,
    ratingCount: place.rating_count || undefined,
    googleMapsUri: place.source_url || '',
    phone: place.phone || undefined,
    utcOffsetMinutes: place.utc_offset_minutes || 0,
    openingHours: place.opening_hours || undefined,
    isDeleted: place.is_deleted,
    address: {
      formattedAddress: place.formatted_address || '',
      shortFormattedAddress: place.short_formatted_address || '',
      country: place.country || '',
      locality: place.locality || '',
      sublocality: place.sublocality || '',
      postalCode: place.postal_code || '',
      postalCodeSuffix: place.postal_code_suffix || '',
      plusCode: place.plus_code || '',
      street: place.street || '',
      streetNumber: place.street_number || '',
      neighborhood: place.neighborhood || '',
      administrativeAreaLevel1: place.administrative_area_level_1 || '',
      administrativeAreaLevel2: place.administrative_area_level_2 || '',
      administrativeAreaLevel3: place.administrative_area_level_3 || '',
    },
  }
}

export function mapToPlaceDetails(
  place: Omit<Place, 'reviews'>,
): Omit<PlaceBase, 'id'> {
  return objectMapper(place)
}
