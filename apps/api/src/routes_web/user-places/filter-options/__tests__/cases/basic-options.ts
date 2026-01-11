import { expect } from 'vitest'
import {
  seedList,
  seedListPlace,
} from '../../../../../__tests__/integration/seeders/list-seeder'
import { seedPlaces } from '../../../../../__tests__/integration/seeders/place-seeder'
import { createApiClient } from '../../../../../__tests__/integration/utils/api-client'
import { assertOk } from '../../../../../__tests__/integration/utils/assertions'
import { createUser } from '../../../../../__tests__/integration/utils/user-manager'
import { DEFAULT_PLACE_STATUS, NO_LISTS_LABEL } from '../../../../../shared'

export const statusOptionsUnique = async () => {
  // Given - User with places having different statuses
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: 'New Place', status: 'NEW' },
    { name: 'Contacted Place', status: 'CONTACTED' },
    { name: 'Won Place', status: 'WON' },
    { name: 'Another Contacted', status: 'CONTACTED' }, // Duplicate status
  ])

  // When
  const response = await createApiClient(user.id).userPlaces.filterOptions({})

  // Then - Should return unique statuses only
  assertOk(response)
  expect(response.body.status).toContain('NEW')
  expect(response.body.status).toContain('CONTACTED')
  expect(response.body.status).toContain('WON')
  // Check uniqueness
  const uniqueStatuses = new Set(response.body.status)
  expect(response.body.status.length).toBe(uniqueStatuses.size)
}

export const statusDefaultIncluded = async () => {
  // Given - User with places that have no explicit status (should default to NEW)
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: 'Place without status' }, // No status set
    { name: 'Contacted Place', status: 'CONTACTED' },
  ])

  // When
  const response = await createApiClient(user.id).userPlaces.filterOptions({})

  // Then - Should include DEFAULT_PLACE_STATUS (NEW) at the start
  assertOk(response)
  expect(response.body.status).toContain(DEFAULT_PLACE_STATUS)
  expect(response.body.status[0]).toBe(DEFAULT_PLACE_STATUS)
}

export const primaryTypeOptionsUnique = async () => {
  // Given - User with places having different primary types
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: 'Restaurant A', primaryType: 'restaurant' },
    { name: 'Cafe', primaryType: 'cafe' },
    { name: 'Restaurant B', primaryType: 'restaurant' }, // Duplicate
    { name: 'Bar', primaryType: 'bar' },
  ])

  // When
  const response = await createApiClient(user.id).userPlaces.filterOptions({})

  // Then
  assertOk(response)
  expect(response.body.primaryType).toContain('restaurant')
  expect(response.body.primaryType).toContain('cafe')
  expect(response.body.primaryType).toContain('bar')
  // Check uniqueness
  const uniqueTypes = new Set(response.body.primaryType)
  expect(response.body.primaryType.length).toBe(uniqueTypes.size)
}

export const typesOptionsFlattened = async () => {
  // Given - User with places having types arrays
  const user = await createUser()
  await seedPlaces(user.id, [
    {
      name: 'Multi-type Place',
      types: ['restaurant', 'food', 'establishment'],
    },
    { name: 'Cafe Place', types: ['cafe', 'food', 'coffee_shop'] },
  ])

  // When
  const response = await createApiClient(user.id).userPlaces.filterOptions({})

  // Then - Should flatten and return unique types from all arrays
  assertOk(response)
  expect(response.body.types).toContain('restaurant')
  expect(response.body.types).toContain('food')
  expect(response.body.types).toContain('establishment')
  expect(response.body.types).toContain('cafe')
  expect(response.body.types).toContain('coffee_shop')
  // Check uniqueness (food appears in both)
  const uniqueTypes = new Set(response.body.types)
  expect(response.body.types.length).toBe(uniqueTypes.size)
}

export const countryOptionsUnique = async () => {
  // Given - User with places in different countries
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: 'Paris Place', country: 'France' },
    { name: 'Berlin Place', country: 'Germany' },
    { name: 'Lyon Place', country: 'France' }, // Duplicate country
    { name: 'Madrid Place', country: 'Spain' },
  ])

  // When
  const response = await createApiClient(user.id).userPlaces.filterOptions({})

  // Then
  assertOk(response)
  expect(response.body.country).toContain('France')
  expect(response.body.country).toContain('Germany')
  expect(response.body.country).toContain('Spain')
  // Check uniqueness
  const uniqueCountries = new Set(response.body.country)
  expect(response.body.country.length).toBe(uniqueCountries.size)
}

export const localityOptionsUnique = async () => {
  // Given - User with places in different localities
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: 'Paris Place 1', locality: 'Paris' },
    { name: 'Lyon Place', locality: 'Lyon' },
    { name: 'Paris Place 2', locality: 'Paris' }, // Duplicate
    { name: 'Marseille Place', locality: 'Marseille' },
  ])

  // When
  const response = await createApiClient(user.id).userPlaces.filterOptions({})

  // Then
  assertOk(response)
  expect(response.body.locality).toContain('Paris')
  expect(response.body.locality).toContain('Lyon')
  expect(response.body.locality).toContain('Marseille')
  // Check uniqueness
  const uniqueLocalities = new Set(response.body.locality)
  expect(response.body.locality.length).toBe(uniqueLocalities.size)
}

export const postalCodeOptionsUnique = async () => {
  // Given - User with places having different postal codes
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: 'Place 75001', postalCode: '75001' },
    { name: 'Place 75002', postalCode: '75002' },
    { name: 'Another 75001', postalCode: '75001' }, // Duplicate
  ])

  // When
  const response = await createApiClient(user.id).userPlaces.filterOptions({})

  // Then
  assertOk(response)
  expect(response.body.postalCode).toContain('75001')
  expect(response.body.postalCode).toContain('75002')
  // Check uniqueness
  const uniqueCodes = new Set(response.body.postalCode)
  expect(response.body.postalCode.length).toBe(uniqueCodes.size)
}

export const sourceOptionsUnique = async () => {
  // Given - All places currently seed with 'google' source (from place-seeder)
  // This test verifies the source options work correctly
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: 'Google Place 1' },
    { name: 'Google Place 2' },
  ])

  // When
  const response = await createApiClient(user.id).userPlaces.filterOptions({})

  // Then - Should return 'google' as the source (from seeder default)
  assertOk(response)
  expect(response.body.source).toContain('google')
}

export const priceLevelOptionsUnique = async () => {
  // Given - User with places having different price levels
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: 'Cheap Place', priceLevel: 'PRICE_LEVEL_INEXPENSIVE' },
    { name: 'Moderate Place', priceLevel: 'PRICE_LEVEL_MODERATE' },
    { name: 'Another Cheap', priceLevel: 'PRICE_LEVEL_INEXPENSIVE' }, // Duplicate
  ])

  // When
  const response = await createApiClient(user.id).userPlaces.filterOptions({})

  // Then
  assertOk(response)
  expect(response.body.priceLevel).toContain('PRICE_LEVEL_INEXPENSIVE')
  expect(response.body.priceLevel).toContain('PRICE_LEVEL_MODERATE')
  // Check uniqueness
  const uniquePriceLevels = new Set(response.body.priceLevel)
  expect(response.body.priceLevel.length).toBe(uniquePriceLevels.size)
}

export const listsOptionsWithNames = async () => {
  // Given - User with places in multiple lists
  const user = await createUser()
  const places = await seedPlaces(user.id, [
    { name: 'Place A' },
    { name: 'Place B' },
    { name: 'Place C' },
  ])

  const list1 = await seedList(user.id, { name: 'My Favorites', emoji: '⭐' })
  const list2 = await seedList(user.id, { name: 'To Visit', emoji: '📍' })

  await seedListPlace(list1.id, places[0].userPlaceId)
  await seedListPlace(list1.id, places[1].userPlaceId)
  await seedListPlace(list2.id, places[1].userPlaceId) // Place B in both lists

  // When
  const response = await createApiClient(user.id).userPlaces.filterOptions({})

  // Then - Should return list names formatted as "emoji name"
  assertOk(response)
  expect(response.body.lists).toContain('⭐ My Favorites')
  expect(response.body.lists).toContain('📍 To Visit')
}

export const listsOptionsIncludesNoLists = async () => {
  // Given - User with some places not in any list
  const user = await createUser()
  const places = await seedPlaces(user.id, [
    { name: 'Listed Place' },
    { name: 'Standalone Place' }, // Not in any list
  ])

  const list = await seedList(user.id, { name: 'My List', emoji: '📋' })
  await seedListPlace(list.id, places[0].userPlaceId)

  // When
  const response = await createApiClient(user.id).userPlaces.filterOptions({})

  // Then - Should include 'No lists' option
  assertOk(response)
  expect(response.body.lists).toContain(NO_LISTS_LABEL)
  expect(response.body.lists[0]).toBe(NO_LISTS_LABEL) // Should be first
}

export const listScopedReturnsAssociatedLists = async () => {
  // Given - User with places in multiple lists, querying specific list
  const user = await createUser()
  const places = await seedPlaces(user.id, [
    { name: 'Place A' },
    { name: 'Place B' },
  ])

  const list1 = await seedList(user.id, { name: 'List One', emoji: '1️⃣' })
  const list2 = await seedList(user.id, { name: 'List Two', emoji: '2️⃣' })
  const list3 = await seedList(user.id, { name: 'List Three', emoji: '3️⃣' })

  // Place A is in List One AND List Two
  await seedListPlace(list1.id, places[0].userPlaceId)
  await seedListPlace(list2.id, places[0].userPlaceId)
  // Place B is in List Three only
  await seedListPlace(list3.id, places[1].userPlaceId)

  // When - Query filter options scoped to List One
  const response = await createApiClient(user.id).userPlaces.filterOptions({
    listId: list1.id,
  })

  // Then - Should return lists that places in List One are also in
  assertOk(response)
  expect(response.body.lists).toContain('1️⃣ List One')
  expect(response.body.lists).toContain('2️⃣ List Two') // Place A is in both
  expect(response.body.lists).not.toContain('3️⃣ List Three') // Place B not in List One
}
