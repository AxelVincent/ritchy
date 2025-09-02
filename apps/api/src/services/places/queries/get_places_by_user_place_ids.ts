import { eq, inArray } from 'drizzle-orm'
import { db } from '../../../db/db'
import { type Place, place, userPlace } from '../../../db/schema'

export type PlaceWithEnrichedAt = Place & {
  enriched_at: Date | null
  user_place_id: string
}

export const getPlacesByUserPlaceIds = async (
  userPlaceIds: string[],
): Promise<PlaceWithEnrichedAt[]> => {
  const places = await db
    .select({
      id: place.id,
      source_id: place.source_id,
      source: place.source,
      source_url: place.source_url,
      website: place.website,
      name: place.name,
      location: place.location,
      types: place.types,
      primary_type: place.primary_type,
      price_level: place.price_level,
      price_range: place.price_range,
      rating: place.rating,
      rating_count: place.rating_count,
      phone: place.phone,
      utc_offset_minutes: place.utc_offset_minutes,
      opening_hours: place.opening_hours,
      formatted_address: place.formatted_address,
      short_formatted_address: place.short_formatted_address,
      country: place.country,
      locality: place.locality,
      sublocality: place.sublocality,
      postal_code: place.postal_code,
      postal_code_suffix: place.postal_code_suffix,
      plus_code: place.plus_code,
      street: place.street,
      street_number: place.street_number,
      neighborhood: place.neighborhood,
      administrative_area_level_1: place.administrative_area_level_1,
      administrative_area_level_2: place.administrative_area_level_2,
      administrative_area_level_3: place.administrative_area_level_3,
      is_deleted: place.is_deleted,
      created_at: place.created_at,
      updated_at: place.updated_at,
      user_place_id: userPlace.id,
      enriched_at: userPlace.enriched_at,
      reviews: place.reviews,
    })
    .from(place)
    .innerJoin(userPlace, eq(place.id, userPlace.place_id))
    .where(inArray(userPlace.id, userPlaceIds))
  return places
}
