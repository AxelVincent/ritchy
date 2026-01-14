import { sql } from 'drizzle-orm'
import { db } from '../../../db/db'
import { place } from '../../../db/schema'
import type { PreferredPlace } from '../types'

/**
 * Maps a Google PreferredPlace to database insert values
 */
export const mapGooglePlaceToDbValues = (googlePlace: PreferredPlace) => ({
  source: 'google' as const,
  source_id: googlePlace.id,
  source_url: googlePlace.googleMapsUri,
  website: googlePlace.websiteUri,
  name: googlePlace.displayName?.text,
  location: googlePlace.location,
  types: googlePlace.types,
  primary_type: googlePlace.primaryType,
  business_status: googlePlace.businessStatus,
  price_level: googlePlace.priceLevel,
  price_range: googlePlace.priceRange,
  rating: googlePlace.rating,
  rating_count: googlePlace.userRatingCount,
  phone: googlePlace.internationalPhoneNumber,
  utc_offset_minutes: googlePlace.utcOffsetMinutes,
  opening_hours: googlePlace.regularOpeningHours,
  formatted_address: googlePlace.formattedAddress,
  short_formatted_address: googlePlace.shortFormattedAddress,
  country:
    googlePlace.addressComponents?.find((component) =>
      component.types?.includes('country'),
    )?.longText || '',
  locality:
    googlePlace.addressComponents?.find((component) =>
      component.types?.includes('locality'),
    )?.longText || '',
  sublocality:
    googlePlace.addressComponents?.find((component) =>
      component.types?.includes('sublocality'),
    )?.longText || '',
  postal_code:
    googlePlace.addressComponents?.find((component) =>
      component.types?.includes('postal_code'),
    )?.longText || '',
  postal_code_suffix:
    googlePlace.addressComponents?.find((component) =>
      component.types?.includes('postal_code_suffix'),
    )?.longText || '',
  plus_code:
    googlePlace.addressComponents?.find((component) =>
      component.types?.includes('plus_code'),
    )?.longText || '',
  street:
    googlePlace.addressComponents?.find((component) =>
      component.types?.includes('route'),
    )?.longText || '',
  street_number:
    googlePlace.addressComponents?.find((component) =>
      component.types?.includes('street_number'),
    )?.longText || '',
  neighborhood:
    googlePlace.addressComponents?.find((component) =>
      component.types?.includes('neighborhood'),
    )?.longText || '',
  administrative_area_level_1:
    googlePlace.addressComponents?.find((component) =>
      component.types?.includes('administrative_area_level_1'),
    )?.longText || '',
  administrative_area_level_2:
    googlePlace.addressComponents?.find((component) =>
      component.types?.includes('administrative_area_level_2'),
    )?.longText || '',
  administrative_area_level_3:
    googlePlace.addressComponents?.find((component) =>
      component.types?.includes('administrative_area_level_3'),
    )?.longText || '',
  reviews:
    googlePlace.reviews?.map((review) => ({
      name: review.name,
      rating: review.rating,
      text: review.text,
      originalText: review.originalText,
      authorAttribution: review.authorAttribution,
      publishTime: review.publishTime,
      googleMapsUri: review.googleMapsUri,
    })) || [],
  google_maps_links: googlePlace.googleMapsLinks,
  editorial_summary: googlePlace.editorialSummary?.text,
  // Store complete Google Place data for API passthrough
  google_place_data: googlePlace,
})

/**
 * Columns to return from place upsert operations
 */
export const placeReturningColumns = {
  id: place.id,
  source: place.source,
  source_id: place.source_id,
  source_url: place.source_url,
  website: place.website,
  name: place.name,
  location: place.location,
  types: place.types,
  primary_type: place.primary_type,
  business_status: place.business_status,
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
  reviews: place.reviews,
  google_maps_links: place.google_maps_links,
  editorial_summary: place.editorial_summary,
  google_place_data: place.google_place_data,
  is_deleted: place.is_deleted,
  created_at: place.created_at,
  updated_at: place.updated_at,
}

/**
 * On conflict update set clause for place upserts
 */
export const placeOnConflictUpdateSet = {
  source: sql`excluded.source`,
  source_id: sql`excluded.source_id`,
  source_url: sql`excluded.source_url`,
  website: sql`excluded.website`,
  name: sql`excluded.name`,
  location: sql`excluded.location`,
  types: sql`excluded.types`,
  primary_type: sql`excluded.primary_type`,
  business_status: sql`excluded.business_status`,
  price_level: sql`excluded.price_level`,
  price_range: sql`excluded.price_range`,
  rating: sql`excluded.rating`,
  rating_count: sql`excluded.rating_count`,
  phone: sql`excluded.phone`,
  utc_offset_minutes: sql`excluded.utc_offset_minutes`,
  opening_hours: sql`excluded.opening_hours`,
  formatted_address: sql`excluded.formatted_address`,
  short_formatted_address: sql`excluded.short_formatted_address`,
  country: sql`excluded.country`,
  locality: sql`excluded.locality`,
  sublocality: sql`excluded.sublocality`,
  postal_code: sql`excluded.postal_code`,
  postal_code_suffix: sql`excluded.postal_code_suffix`,
  plus_code: sql`excluded.plus_code`,
  street: sql`excluded.street`,
  street_number: sql`excluded.street_number`,
  neighborhood: sql`excluded.neighborhood`,
  administrative_area_level_1: sql`excluded.administrative_area_level_1`,
  administrative_area_level_2: sql`excluded.administrative_area_level_2`,
  administrative_area_level_3: sql`excluded.administrative_area_level_3`,
  reviews: sql`excluded.reviews`,
  google_maps_links: sql`excluded.google_maps_links`,
  editorial_summary: sql`excluded.editorial_summary`,
  google_place_data: sql`excluded.google_place_data`,
  updated_at: sql`excluded.updated_at`,
  is_deleted: sql`excluded.is_deleted`,
}

/**
 * Upserts a single Google Place into the database
 * Returns the upserted place with all fields
 */
export const upsertGooglePlace = async (googlePlace: PreferredPlace) => {
  const [upsertedPlace] = await db
    .insert(place)
    .values(mapGooglePlaceToDbValues(googlePlace))
    .returning(placeReturningColumns)
    .onConflictDoUpdate({
      target: place.source_id,
      set: placeOnConflictUpdateSet,
    })

  return upsertedPlace
}

/**
 * Upserts multiple Google Places into the database
 * Returns the upserted places with all fields
 */
export const upsertGooglePlaces = async (googlePlaces: PreferredPlace[]) => {
  if (googlePlaces.length === 0) {
    return []
  }

  const upsertedPlaces = await db
    .insert(place)
    .values(googlePlaces.map(mapGooglePlaceToDbValues))
    .returning(placeReturningColumns)
    .onConflictDoUpdate({
      target: place.source_id,
      set: placeOnConflictUpdateSet,
    })

  return upsertedPlaces
}
