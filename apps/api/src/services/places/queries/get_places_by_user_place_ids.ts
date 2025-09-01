import { eq, inArray } from 'drizzle-orm'
import { db } from '../../../db/db'
import { type Place, place, userPlace } from '../../../db/schema'

export type PlaceWithEnrichedAt = Place & {
  enrichedAt: Date | null
  userPlaceId: string
}

export const getPlacesByUserPlaceIds = async (
  userPlaceIds: string[],
): Promise<PlaceWithEnrichedAt[]> => {
  const places = await db
    .select({
      id: place.id,
      sourceId: place.sourceId,
      source: place.source,
      sourceUrl: place.sourceUrl,
      website: place.website,
      name: place.name,
      location: place.location,
      types: place.types,
      primaryType: place.primaryType,
      priceLevel: place.priceLevel,
      priceRange: place.priceRange,
      rating: place.rating,
      ratingCount: place.ratingCount,
      phone: place.phone,
      utcOffsetMinutes: place.utcOffsetMinutes,
      openingHours: place.openingHours,
      formattedAddress: place.formattedAddress,
      shortFormattedAddress: place.shortFormattedAddress,
      country: place.country,
      locality: place.locality,
      sublocality: place.sublocality,
      postalCode: place.postalCode,
      postalCodeSuffix: place.postalCodeSuffix,
      plusCode: place.plusCode,
      street: place.street,
      streetNumber: place.streetNumber,
      neighborhood: place.neighborhood,
      administrativeAreaLevel1: place.administrativeAreaLevel1,
      administrativeAreaLevel2: place.administrativeAreaLevel2,
      administrativeAreaLevel3: place.administrativeAreaLevel3,
      isDeleted: place.isDeleted,
      createdAt: place.createdAt,
      updatedAt: place.updatedAt,
      userPlaceId: userPlace.id,
      enrichedAt: userPlace.enrichedAt,
      reviews: place.reviews,
    })
    .from(place)
    .innerJoin(userPlace, eq(place.id, userPlace.placeId))
    .where(inArray(userPlace.id, userPlaceIds))
  return places
}
