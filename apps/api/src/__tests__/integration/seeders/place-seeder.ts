import type { PriceLevelEnum } from '@ritchy/types'
import { place, status, userPlace } from '../../../db/schema'
import { getTestDb } from '../setup/test-database'
import { cleanupManager } from '../utils/cleanup-manager'

export interface PlaceData {
  name: string
  country?: string
  locality?: string
  postalCode?: string
  street?: string
  rating?: number
  ratingCount?: number
  primaryType?: string
  types?: string[]
  website?: string
  phone?: string
  priceLevel?: (typeof PriceLevelEnum.options)[number]
  status?:
    | 'NEW'
    | 'NO_ANSWER'
    | 'CONTACTED'
    | 'FOLLOW_UP'
    | 'MEETING'
    | 'INTERESTED'
    | 'WON'
    | 'LOST'
  formattedAddress?: string
  sourceUrl?: string
}

export const seedPlace = async (userId: string, data: PlaceData) => {
  const db = getTestDb()
  const placeId = crypto.randomUUID()
  const userPlaceId = crypto.randomUUID()

  await db.insert(place).values({
    id: placeId,
    source: 'google',
    source_id: `gm_${crypto.randomUUID()}`,
    name: data.name,
    country: data.country,
    locality: data.locality,
    postal_code: data.postalCode,
    street: data.street,
    rating: data.rating,
    rating_count: data.ratingCount,
    primary_type: data.primaryType ?? 'restaurant',
    types: data.types ?? ['restaurant'],
    website: data.website ?? 'https://test-place.example.com',
    phone: data.phone ?? '+33123456789',
    price_level: data.priceLevel,
    formatted_address:
      data.formattedAddress ??
      `123 Test Street, ${data.locality ?? 'Paris'}, ${data.country ?? 'France'}`,
    // sourceUrl is required to prevent refresh calls to Google API
    source_url: data.sourceUrl ?? 'https://maps.google.com/?cid=123456789',
    location: { latitude: 48.8566, longitude: 2.3522 },
  })

  cleanupManager.trackPlace(placeId)

  await db.insert(userPlace).values({
    id: userPlaceId,
    user_id: userId,
    place_id: placeId,
  })

  if (data.status) {
    await db.insert(status).values({
      id: crypto.randomUUID(),
      userPlaceId: userPlaceId,
      status: data.status,
    })
  }

  return { placeId, userPlaceId }
}

export const seedPlaces = async (userId: string, places: PlaceData[]) => {
  const results = []
  for (const p of places) {
    results.push(await seedPlace(userId, p))
  }
  return results
}
