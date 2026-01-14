import { expect } from 'vitest'
import { seedEnrichment } from '../../../../../__tests__/integration/seeders/enrichment-seeder'
import { seedPlace } from '../../../../../__tests__/integration/seeders/place-seeder'
import { getTestDb } from '../../../../../__tests__/integration/setup/test-database'
import { createApiClient } from '../../../../../__tests__/integration/utils/api-client'
import { assertOk } from '../../../../../__tests__/integration/utils/assertions'
import { cleanupManager } from '../../../../../__tests__/integration/utils/cleanup-manager'
import { createUser } from '../../../../../__tests__/integration/utils/user-manager'
import {
  enrichment,
  place,
  searchPlace,
  userPlace,
} from '../../../../../db/schema'

/**
 * Test default sorting behavior:
 * - Search view (with searchId): default to searchPlaceCreatedAt DESC (search_place.created_at)
 *   This preserves the enrichment score ordering set by populateSearchPlacesIfEmpty
 * - All places view (no searchId): default to createdAt DESC (user_place.created_at)
 */

/**
 * Test that search view defaults to search_place.created_at ordering.
 * This is critical because populateSearchPlacesIfEmpty orders places by enrichment score
 * and stores that order in search_place.created_at with incremental timestamps.
 */
export const searchViewSortsBySearchPlaceCreatedAtByDefault = async () => {
  const db = getTestDb()

  // Given - Create user
  const user = await createUser()

  // Create a search
  const searchId = crypto.randomUUID()
  const { search: searchTable } = await import('../../../../../db/schema')
  await db.insert(searchTable).values({
    id: searchId,
    userId: user.id,
    placeName: 'Test Location',
    keyword: 'test companies',
    model: 'BASIC',
    limit: 60,
    rectangle: {
      northEast: { latitude: 48.9, longitude: 2.5 },
      southWest: { latitude: 48.8, longitude: 2.2 },
    },
  })
  cleanupManager.trackSearch(searchId)

  // Create 3 places with the SAME user_place.created_at but DIFFERENT search_place.created_at
  // This verifies we're sorting by search_place.created_at, not user_place.created_at
  const baseUserPlaceTime = new Date()
  const placesData = [
    { name: 'Place A - Should be third', searchPlaceOffset: 0 },
    { name: 'Place B - Should be second', searchPlaceOffset: 100 },
    { name: 'Place C - Should be first', searchPlaceOffset: 200 },
  ]

  for (const pData of placesData) {
    const placeId = crypto.randomUUID()
    const userPlaceId = crypto.randomUUID()

    // Insert place
    await db.insert(place).values({
      id: placeId,
      source: 'google',
      source_id: `gm_test_${crypto.randomUUID().slice(0, 8)}`,
      name: pData.name,
      country: 'France',
      location: { latitude: 48.8566, longitude: 2.3522 },
      source_url: 'https://maps.google.com/?cid=123456789',
    })
    cleanupManager.trackPlace(placeId)

    // Insert user_place with the SAME timestamp for all
    await db.insert(userPlace).values({
      id: userPlaceId,
      user_id: user.id,
      place_id: placeId,
      created_at: baseUserPlaceTime,
    })

    // Insert search_place with DIFFERENT timestamps (incremental)
    // Higher offset = more recent = should appear first in DESC order
    await db.insert(searchPlace).values({
      searchId,
      userPlaceId,
      createdAt: new Date(
        baseUserPlaceTime.getTime() + pData.searchPlaceOffset,
      ),
    })
  }

  // When - Query the search WITHOUT specifying sortBy (default = searchPlaceCreatedAt DESC)
  const response = await createApiClient(user.id).userPlaces.get({
    searchId,
  })

  // Then - Places should be ordered by search_place.created_at DESC
  assertOk(response)
  expect(response.body.items).toHaveLength(3)

  // Verify order: C (newest search_place) -> B -> A (oldest search_place)
  expect(response.body.items[0].name).toBe('Place C - Should be first')
  expect(response.body.items[1].name).toBe('Place B - Should be second')
  expect(response.body.items[2].name).toBe('Place A - Should be third')
}

/**
 * Test that simulates the full populateSearchPlacesIfEmpty behavior:
 * Places are reordered by enrichment score, and the order is stored
 * in search_place.created_at via incremental timestamps.
 */
export const searchViewPreservesEnrichmentScoreOrder = async () => {
  const db = getTestDb()

  // Given - Create user
  const user = await createUser()

  // Create a search
  const searchId = crypto.randomUUID()
  const { search: searchTable } = await import('../../../../../db/schema')
  await db.insert(searchTable).values({
    id: searchId,
    userId: user.id,
    placeName: 'Test Location',
    keyword: 'test companies',
    model: 'BASIC',
    limit: 60,
    rectangle: {
      northEast: { latitude: 48.9, longitude: 2.5 },
      southWest: { latitude: 48.8, longitude: 2.2 },
    },
  })
  cleanupManager.trackSearch(searchId)

  // Simulate what populateSearchPlacesIfEmpty does:
  // 1. Places are fetched from Google Maps
  // 2. user_places are created (batch insert, similar timestamps)
  // 3. reorderByEnrichmentScore sorts by score DESC (highest first)
  // 4. search_places are created with incremental timestamps preserving the order
  //
  // So place with highest score gets the LATEST search_place.created_at
  const placesWithScores = [
    { name: 'Low Score Place', score: 20 },
    { name: 'Medium Score Place', score: 50 },
    { name: 'High Score Place', score: 85 },
  ]

  // Sort by score DESC (like reorderByEnrichmentScore does)
  const sortedByScore = [...placesWithScores].sort((a, b) => b.score - a.score)

  const baseTime = new Date()
  const baseUserPlaceTime = new Date(baseTime.getTime() - 10000) // 10 seconds earlier

  for (let i = 0; i < sortedByScore.length; i++) {
    const pData = sortedByScore[i]
    const placeId = crypto.randomUUID()
    const userPlaceId = crypto.randomUUID()

    // Insert place
    await db.insert(place).values({
      id: placeId,
      source: 'google',
      source_id: `gm_test_${crypto.randomUUID().slice(0, 8)}`,
      name: pData.name,
      country: 'France',
      location: { latitude: 48.8566, longitude: 2.3522 },
      source_url: 'https://maps.google.com/?cid=123456789',
    })
    cleanupManager.trackPlace(placeId)

    // user_place with similar timestamps (batch insert)
    await db.insert(userPlace).values({
      id: userPlaceId,
      user_id: user.id,
      place_id: placeId,
      created_at: baseUserPlaceTime,
      enriched_at: new Date(),
    })

    // enrichment with score
    await db.insert(enrichment).values({
      id: crypto.randomUUID(),
      placeId: placeId,
      success: true,
      shortDescription: `${pData.name} description`,
      score: pData.score,
    })

    // search_place with incremental timestamp (preserves sort order)
    // Since we sort by created_at DESC, highest score (first in array) needs LATEST timestamp
    // We reverse the offset so index 0 gets the highest timestamp
    const reverseOffset = sortedByScore.length - 1 - i
    await db.insert(searchPlace).values({
      searchId,
      userPlaceId,
      createdAt: new Date(baseTime.getTime() + reverseOffset),
    })
  }

  // When - Query the search (default sort = searchPlaceCreatedAt DESC)
  const response = await createApiClient(user.id).userPlaces.get({
    searchId,
  })

  // Then - Places should be ordered by enrichment score (via search_place.created_at)
  // Highest score gets latest timestamp, so it appears first in DESC order
  assertOk(response)
  expect(response.body.items).toHaveLength(3)

  // Expected order: High (85) -> Medium (50) -> Low (20)
  expect(response.body.items[0].name).toBe('High Score Place')
  expect(response.body.items[1].name).toBe('Medium Score Place')
  expect(response.body.items[2].name).toBe('Low Score Place')

  // Verify enrichment data is present
  expect(response.body.items[0].shortDescription).toBe(
    'High Score Place description',
  )
}

/**
 * Test that all places view (no searchId) still defaults to user_place.created_at
 */
export const allPlacesViewSortsByUserPlaceCreatedAtByDefault = async () => {
  // Given - Create user
  const user = await createUser()

  // Create places with explicit timestamps
  await seedPlace(user.id, {
    name: 'First Added Place',
    country: 'France',
  })

  // Small delay to ensure different user_place.created_at timestamps
  await new Promise((resolve) => setTimeout(resolve, 50))

  await seedPlace(user.id, {
    name: 'Second Added Place',
    country: 'France',
  })

  await new Promise((resolve) => setTimeout(resolve, 50))

  await seedPlace(user.id, {
    name: 'Third Added Place',
    country: 'France',
  })

  // When - Query all places WITHOUT specifying sortBy (default = createdAt DESC)
  const response = await createApiClient(user.id).userPlaces.get()

  // Then - Places should be ordered by user_place.created_at DESC (newest first)
  assertOk(response)
  expect(response.body.items).toHaveLength(3)

  // Verify order: Third (newest) -> Second -> First (oldest)
  expect(response.body.items[0].name).toBe('Third Added Place')
  expect(response.body.items[1].name).toBe('Second Added Place')
  expect(response.body.items[2].name).toBe('First Added Place')

  // Verify createdAt values are in descending order
  const createdAts = response.body.items.map((item: { createdAt: string }) =>
    new Date(item.createdAt).getTime(),
  )
  expect(createdAts[0]).toBeGreaterThan(createdAts[1])
  expect(createdAts[1]).toBeGreaterThan(createdAts[2])
}

/**
 * Test that when frontend passes sortBy=createdAt with sortOrder=desc for a search view,
 * it still uses search_place.created_at (enrichment score order).
 * This handles the case where frontend sends a default sortBy value.
 */
export const searchViewWithExplicitCreatedAtDescStillUsesSearchPlaceCreatedAt =
  async () => {
    const db = getTestDb()

    // Given - Create user
    const user = await createUser()

    // Create a search
    const searchId = crypto.randomUUID()
    const { search: searchTable } = await import('../../../../../db/schema')
    await db.insert(searchTable).values({
      id: searchId,
      userId: user.id,
      placeName: 'Test Location',
      keyword: 'test companies',
      model: 'BASIC',
      limit: 60,
      rectangle: {
        northEast: { latitude: 48.9, longitude: 2.5 },
        southWest: { latitude: 48.8, longitude: 2.2 },
      },
    })
    cleanupManager.trackSearch(searchId)

    // Create 3 places with the SAME user_place.created_at but DIFFERENT search_place.created_at
    const baseUserPlaceTime = new Date()
    const placesData = [
      { name: 'Place A - Should be third', searchPlaceOffset: 0 },
      { name: 'Place B - Should be second', searchPlaceOffset: 100 },
      { name: 'Place C - Should be first', searchPlaceOffset: 200 },
    ]

    for (const pData of placesData) {
      const placeId = crypto.randomUUID()
      const userPlaceId = crypto.randomUUID()

      await db.insert(place).values({
        id: placeId,
        source: 'google',
        source_id: `gm_test_${crypto.randomUUID().slice(0, 8)}`,
        name: pData.name,
        country: 'France',
        location: { latitude: 48.8566, longitude: 2.3522 },
        source_url: 'https://maps.google.com/?cid=123456789',
      })
      cleanupManager.trackPlace(placeId)

      await db.insert(userPlace).values({
        id: userPlaceId,
        user_id: user.id,
        place_id: placeId,
        created_at: baseUserPlaceTime,
      })

      await db.insert(searchPlace).values({
        searchId,
        userPlaceId,
        createdAt: new Date(
          baseUserPlaceTime.getTime() + pData.searchPlaceOffset,
        ),
      })
    }

    // When - Query with explicit sortBy=createdAt and sortOrder=desc (frontend default)
    const response = await createApiClient(user.id).userPlaces.get({
      searchId,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    })

    // Then - Should still use search_place.created_at DESC (enrichment score order)
    assertOk(response)
    expect(response.body.items).toHaveLength(3)

    // Verify order: C (newest search_place) -> B -> A (oldest search_place)
    expect(response.body.items[0].name).toBe('Place C - Should be first')
    expect(response.body.items[1].name).toBe('Place B - Should be second')
    expect(response.body.items[2].name).toBe('Place A - Should be third')
  }

/**
 * Test sortBy=createdAt with sortOrder=asc in search view.
 * Even with ASC order, search views should use search_place.created_at.
 */
export const searchViewWithCreatedAtAscUsesSearchPlaceCreatedAt = async () => {
  const db = getTestDb()

  // Given - Create user
  const user = await createUser()

  // Create a search
  const searchId = crypto.randomUUID()
  const { search: searchTable } = await import('../../../../../db/schema')
  await db.insert(searchTable).values({
    id: searchId,
    userId: user.id,
    placeName: 'Test Location',
    keyword: 'test companies',
    model: 'BASIC',
    limit: 60,
    rectangle: {
      northEast: { latitude: 48.9, longitude: 2.5 },
      southWest: { latitude: 48.8, longitude: 2.2 },
    },
  })
  cleanupManager.trackSearch(searchId)

  // Create 3 places with the SAME user_place.created_at but DIFFERENT search_place.created_at
  const baseUserPlaceTime = new Date()
  const placesData = [
    { name: 'Place A - Oldest search_place', searchPlaceOffset: 0 },
    { name: 'Place B - Middle search_place', searchPlaceOffset: 100 },
    { name: 'Place C - Newest search_place', searchPlaceOffset: 200 },
  ]

  for (const pData of placesData) {
    const placeId = crypto.randomUUID()
    const userPlaceId = crypto.randomUUID()

    await db.insert(place).values({
      id: placeId,
      source: 'google',
      source_id: `gm_test_${crypto.randomUUID().slice(0, 8)}`,
      name: pData.name,
      country: 'France',
      location: { latitude: 48.8566, longitude: 2.3522 },
      source_url: 'https://maps.google.com/?cid=123456789',
    })
    cleanupManager.trackPlace(placeId)

    await db.insert(userPlace).values({
      id: userPlaceId,
      user_id: user.id,
      place_id: placeId,
      created_at: baseUserPlaceTime,
    })

    await db.insert(searchPlace).values({
      searchId,
      userPlaceId,
      createdAt: new Date(
        baseUserPlaceTime.getTime() + pData.searchPlaceOffset,
      ),
    })
  }

  // When - Query with sortBy=createdAt and sortOrder=asc
  const response = await createApiClient(user.id).userPlaces.get({
    searchId,
    sortBy: 'createdAt',
    sortOrder: 'asc',
  })

  // Then - Should use search_place.created_at ASC (reverse enrichment score order)
  assertOk(response)
  expect(response.body.items).toHaveLength(3)

  // Verify order: A (oldest search_place) -> B -> C (newest search_place)
  expect(response.body.items[0].name).toBe('Place A - Oldest search_place')
  expect(response.body.items[1].name).toBe('Place B - Middle search_place')
  expect(response.body.items[2].name).toBe('Place C - Newest search_place')
}

/**
 * Test that createdAt field is returned in response
 */
export const createdAtFieldIsReturnedInResponse = async () => {
  // Given - Create user and a place with enrichment
  const user = await createUser()
  const p = await seedPlace(user.id, {
    name: 'Test Place',
    country: 'France',
  })

  await seedEnrichment(p.placeId, p.userPlaceId, {
    shortDescription: 'A test place',
    score: 50,
  })

  // When - Query all places
  const response = await createApiClient(user.id).userPlaces.get()

  // Then - createdAt field should be present and valid
  assertOk(response)
  expect(response.body.items).toHaveLength(1)

  const returnedPlace = response.body.items[0]
  expect(returnedPlace.createdAt).toBeDefined()

  // Verify it's a valid date string
  const createdAt = new Date(returnedPlace.createdAt)
  expect(createdAt.getTime()).not.toBeNaN()

  // Verify it's recent (within last minute)
  const now = new Date()
  const diffMs = now.getTime() - createdAt.getTime()
  expect(diffMs).toBeLessThan(60000) // Less than 1 minute ago
}
