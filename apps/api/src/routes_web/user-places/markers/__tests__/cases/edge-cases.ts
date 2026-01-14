import { expect } from 'vitest'
import {
  seedList,
  seedListPlace,
} from '../../../../../__tests__/integration/seeders/list-seeder'
import { seedPlaces } from '../../../../../__tests__/integration/seeders/place-seeder'
import { createApiClient } from '../../../../../__tests__/integration/utils/api-client'
import { assertOk } from '../../../../../__tests__/integration/utils/assertions'
import { createUser } from '../../../../../__tests__/integration/utils/user-manager'

export const noPlacesReturnsEmptyArray = async () => {
  // Given - User with NO places
  const user = await createUser()
  // No places seeded

  // When
  const response = await createApiClient(user.id).userPlaces.markers({})

  // Then - Should return empty markers array
  assertOk(response)
  expect(response.body.markers).toEqual([])
  expect(response.body.totalCount).toBe(0)
}

export const emptyListReturnsEmptyArray = async () => {
  // Given - User with an empty list
  const user = await createUser()
  await seedPlaces(user.id, [{ name: 'Standalone Place' }])
  const emptyList = await seedList(user.id, { name: 'Empty List' })
  // No places added to the list

  // When - Query markers for empty list
  const response = await createApiClient(user.id).userPlaces.markers({
    listId: emptyList.id,
  })

  // Then
  assertOk(response)
  expect(response.body.markers).toEqual([])
  expect(response.body.totalCount).toBe(0)
}

export const filterWithNoMatchesReturnsEmpty = async () => {
  // Given - User with places that won't match filter
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: 'French Place', country: 'France' },
    { name: 'German Place', country: 'Germany' },
  ])

  // When - Filter by country that doesn't exist (as array for multi-select)
  const response = await createApiClient(user.id).userPlaces.markers({
    country: ['Japan'],
  })

  // Then
  assertOk(response)
  expect(response.body.markers).toEqual([])
  expect(response.body.totalCount).toBe(0)
}

export const specialCharactersInName = async () => {
  // Given - User with places having special characters
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: "L'Atelier du Chef" },
    { name: 'Café Müller' },
    { name: "O'Brien's Irish Pub" },
  ])

  // When - Search with special characters
  const response = await createApiClient(user.id).userPlaces.markers({
    name: "L'Atelier",
  })

  // Then
  assertOk(response)
  expect(response.body.markers).toHaveLength(1)
  expect(response.body.markers[0].name).toBe("L'Atelier du Chef")
}

export const markersOnlyForUserPlaces = async () => {
  // Given - Two users with their own places
  const user1 = await createUser()
  const user2 = await createUser()

  await seedPlaces(user1.id, [
    { name: 'User1 Place A' },
    { name: 'User1 Place B' },
  ])
  await seedPlaces(user2.id, [
    { name: 'User2 Place A' },
    { name: 'User2 Place B' },
    { name: 'User2 Place C' },
  ])

  // When - User1 queries markers
  const response = await createApiClient(user1.id).userPlaces.markers({})

  // Then - Should only return User1's places
  assertOk(response)
  expect(response.body.markers).toHaveLength(2)
  const names = response.body.markers.map((m: { name: string }) => m.name)
  expect(names).toContain('User1 Place A')
  expect(names).toContain('User1 Place B')
  expect(names).not.toContain('User2 Place A')
}

export const conflictingFiltersReturnsEmpty = async () => {
  // Given - User with places
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: 'French New', country: 'France', status: 'NEW' },
    { name: 'German Contacted', country: 'Germany', status: 'CONTACTED' },
  ])

  // When - Apply conflicting filters (France + CONTACTED = no matches)
  const response = await createApiClient(user.id).userPlaces.markers({
    country: ['France'],
    status: 'CONTACTED',
  })

  // Then
  assertOk(response)
  expect(response.body.markers).toEqual([])
  expect(response.body.totalCount).toBe(0)
}

export const listScopeWithFilters = async () => {
  // Given - User with places in a list, with additional filters
  const user = await createUser()
  const places = await seedPlaces(user.id, [
    { name: 'List Place A', status: 'NEW' },
    { name: 'List Place B', status: 'CONTACTED' },
    { name: 'Standalone', status: 'NEW' },
  ])

  const list = await seedList(user.id, { name: 'My List' })
  await seedListPlace(list.id, places[0].userPlaceId)
  await seedListPlace(list.id, places[1].userPlaceId)

  // When - Query list with status filter
  const response = await createApiClient(user.id).userPlaces.markers({
    listId: list.id,
    status: 'NEW',
  })

  // Then - Should only return places in list AND matching filter
  assertOk(response)
  expect(response.body.markers).toHaveLength(1)
  expect(response.body.markers[0].name).toBe('List Place A')
}

export const markersUniqueNoduplicates = async () => {
  // Given - User with a place in multiple lists (shouldn't duplicate markers)
  const user = await createUser()
  const places = await seedPlaces(user.id, [{ name: 'Multi-list Place' }])

  const list1 = await seedList(user.id, { name: 'List 1' })
  const list2 = await seedList(user.id, { name: 'List 2' })

  await seedListPlace(list1.id, places[0].userPlaceId)
  await seedListPlace(list2.id, places[0].userPlaceId)

  // When - Query all markers
  const response = await createApiClient(user.id).userPlaces.markers({})

  // Then - Should only return one marker (no duplicates)
  assertOk(response)
  expect(response.body.markers).toHaveLength(1)
  expect(response.body.totalCount).toBe(1)
}
