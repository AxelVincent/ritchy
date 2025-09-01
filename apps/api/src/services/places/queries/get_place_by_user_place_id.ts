import { eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../db/db'
import { place as placeTable, userPlace } from '../../../db/schema'
import type * as schema from '../../../db/schema'
import type { PlaceWithEnrichedAt } from './get_places_by_user_place_ids'

export const getPlaceByUserPlaceId = async (
  userPlaceId: string,
  tx?: PostgresJsDatabase<typeof schema>,
): Promise<PlaceWithEnrichedAt> => {
  const dbOrTx = tx ?? db
  const [place] = await dbOrTx
    .select({
      id: placeTable.id,
      sourceId: placeTable.sourceId,
      source: placeTable.source,
      sourceUrl: placeTable.sourceUrl,
      website: placeTable.website,
      name: placeTable.name,
      location: placeTable.location,
      types: placeTable.types,
      primaryType: placeTable.primaryType,
      priceLevel: placeTable.priceLevel,
      priceRange: placeTable.priceRange,
      rating: placeTable.rating,
      ratingCount: placeTable.ratingCount,
      phone: placeTable.phone,
      utcOffsetMinutes: placeTable.utcOffsetMinutes,
      openingHours: placeTable.openingHours,
      formattedAddress: placeTable.formattedAddress,
      shortFormattedAddress: placeTable.shortFormattedAddress,
      country: placeTable.country,
      locality: placeTable.locality,
      sublocality: placeTable.sublocality,
      postalCode: placeTable.postalCode,
      postalCodeSuffix: placeTable.postalCodeSuffix,
      plusCode: placeTable.plusCode,
      street: placeTable.street,
      streetNumber: placeTable.streetNumber,
      neighborhood: placeTable.neighborhood,
      administrativeAreaLevel1: placeTable.administrativeAreaLevel1,
      administrativeAreaLevel2: placeTable.administrativeAreaLevel2,
      administrativeAreaLevel3: placeTable.administrativeAreaLevel3,
      isDeleted: placeTable.isDeleted,
      createdAt: placeTable.createdAt,
      updatedAt: placeTable.updatedAt,
      userPlaceId: userPlace.id,
      enrichedAt: userPlace.enrichedAt,
      reviews: placeTable.reviews,
    })
    .from(placeTable)
    .innerJoin(userPlace, eq(placeTable.id, userPlace.placeId))
    .where(eq(userPlace.id, userPlaceId))
    .limit(1)
  return place
}
