import { eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../db/db'
import { place as placeTable, userPlace } from '../../../db/schema'
import type * as schema from '../../../db/schema'
import type { PlaceWithEnrichedAt } from './get_places_by_user_place_ids'

export const getPlaceBySourceId = async (
  sourceId: string,
  tx?: PostgresJsDatabase<typeof schema>,
): Promise<PlaceWithEnrichedAt> => {
  const dbOrTx = tx ?? db
  const [place] = await dbOrTx
    .select({
      id: placeTable.id,
      source_id: placeTable.source_id,
      source: placeTable.source,
      source_url: placeTable.source_url,
      website: placeTable.website,
      name: placeTable.name,
      location: placeTable.location,
      types: placeTable.types,
      primary_type: placeTable.primary_type,
      price_level: placeTable.price_level,
      price_range: placeTable.price_range,
      rating: placeTable.rating,
      rating_count: placeTable.rating_count,
      phone: placeTable.phone,
      utc_offset_minutes: placeTable.utc_offset_minutes,
      opening_hours: placeTable.opening_hours,
      formatted_address: placeTable.formatted_address,
      short_formatted_address: placeTable.short_formatted_address,
      country: placeTable.country,
      locality: placeTable.locality,
      sublocality: placeTable.sublocality,
      postal_code: placeTable.postal_code,
      postal_code_suffix: placeTable.postal_code_suffix,
      plus_code: placeTable.plus_code,
      street: placeTable.street,
      street_number: placeTable.street_number,
      neighborhood: placeTable.neighborhood,
      administrative_area_level_1: placeTable.administrative_area_level_1,
      administrative_area_level_2: placeTable.administrative_area_level_2,
      administrative_area_level_3: placeTable.administrative_area_level_3,
      is_deleted: placeTable.is_deleted,
      created_at: placeTable.created_at,
      updated_at: placeTable.updated_at,
      reviews: placeTable.reviews,
    })
    .from(placeTable)
    .where(eq(placeTable.source_id, sourceId))
    .limit(1)
  return {
    ...place,
    enriched_at: null,
    user_place_id: '',
  }
}
