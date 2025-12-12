import { expect } from 'vitest'
import {
  seedList,
  seedListPlace,
} from '../../../../../__tests__/integration/seeders/list-seeder'
import { seedPlaces } from '../../../../../__tests__/integration/seeders/place-seeder'
import {
  seedSearch,
  seedSearchPlace,
} from '../../../../../__tests__/integration/seeders/search-seeder'
import { createApiClient } from '../../../../../__tests__/integration/utils/api-client'
import { assertOk } from '../../../../../__tests__/integration/utils/assertions'
import { createUser } from '../../../../../__tests__/integration/utils/user-manager'

export const scopeByListId = async () => {
  // Given - User with places in different lists
  const user = await createUser()
  const places = await seedPlaces(user.id, [
    { name: 'Place in List A', country: 'France' },
    { name: 'Place in List B', country: 'Germany' },
    { name: 'Place in List A too', country: 'Spain' },
  ])

  const listA = await seedList(user.id, { name: 'List A', emoji: '🅰️' })
  const listB = await seedList(user.id, { name: 'List B', emoji: '🅱️' })

  await seedListPlace(listA.id, places[0].userPlaceId)
  await seedListPlace(listA.id, places[2].userPlaceId)
  await seedListPlace(listB.id, places[1].userPlaceId)

  // When - Query markers with listId filter
  const response = await createApiClient(user.id).userPlaces.markers({
    listId: listA.id,
  })

  // Then - Should return only markers from List A
  assertOk(response)
  expect(response.body.markers).toHaveLength(2)
  expect(response.body.totalCount).toBe(2)
  const names = response.body.markers.map((m: { name: string }) => m.name)
  expect(names).toContain('Place in List A')
  expect(names).toContain('Place in List A too')
  expect(names).not.toContain('Place in List B')
}

export const scopeBySearchId = async () => {
  // Given - User with places in different searches
  const user = await createUser()
  const places = await seedPlaces(user.id, [
    { name: 'Restaurant Paris', country: 'France' },
    { name: 'Cafe Berlin', country: 'Germany' },
    { name: 'Bakery Paris', country: 'France' },
  ])

  const searchParis = await seedSearch(user.id, {
    keyword: 'restaurants paris',
  })
  const searchBerlin = await seedSearch(user.id, { keyword: 'cafes berlin' })

  await seedSearchPlace(searchParis.id, places[0].userPlaceId)
  await seedSearchPlace(searchParis.id, places[2].userPlaceId)
  await seedSearchPlace(searchBerlin.id, places[1].userPlaceId)

  // When - Query markers with searchId filter
  const response = await createApiClient(user.id).userPlaces.markers({
    searchId: searchParis.id,
  })

  // Then - Should return only markers from Paris search
  assertOk(response)
  expect(response.body.markers).toHaveLength(2)
  expect(response.body.totalCount).toBe(2)
  const names = response.body.markers.map((m: { name: string }) => m.name)
  expect(names).toContain('Restaurant Paris')
  expect(names).toContain('Bakery Paris')
  expect(names).not.toContain('Cafe Berlin')
}

export const scopeListNotFound = async () => {
  // Given - User with places but querying non-existent list
  const user = await createUser()
  await seedPlaces(user.id, [{ name: 'Some Place', country: 'France' }])

  const nonExistentListId = crypto.randomUUID()

  // When - Query with non-existent listId
  const response = await createApiClient(user.id).userPlaces.markers({
    listId: nonExistentListId,
  })

  // Then
  expect(response.status).toBe(404)
  expect(response.body.error).toBe('List not found')
}

export const scopeSearchNotFound = async () => {
  // Given - User with places but querying non-existent search
  const user = await createUser()
  await seedPlaces(user.id, [{ name: 'Some Place', country: 'France' }])

  const nonExistentSearchId = crypto.randomUUID()

  // When - Query with non-existent searchId
  const response = await createApiClient(user.id).userPlaces.markers({
    searchId: nonExistentSearchId,
  })

  // Then
  expect(response.status).toBe(404)
  expect(response.body.error).toBe('Search not found')
}

export const scopeListWrongUser = async () => {
  // Given - Two users, list belongs to user2
  const user1 = await createUser()
  const user2 = await createUser()

  await seedPlaces(user1.id, [{ name: 'User1 Place', country: 'France' }])
  const user2List = await seedList(user2.id, { name: 'User2 List' })

  // When - User1 tries to access User2's list
  const response = await createApiClient(user1.id).userPlaces.markers({
    listId: user2List.id,
  })

  // Then - Should return 404 (not 403) to avoid leaking existence
  expect(response.status).toBe(404)
  expect(response.body.error).toBe('List not found')
}

export const scopeSearchWrongUser = async () => {
  // Given - Two users, search belongs to user2
  const user1 = await createUser()
  const user2 = await createUser()

  await seedPlaces(user1.id, [{ name: 'User1 Place', country: 'France' }])
  const user2Search = await seedSearch(user2.id, { keyword: 'test search' })

  // When - User1 tries to access User2's search
  const response = await createApiClient(user1.id).userPlaces.markers({
    searchId: user2Search.id,
  })

  // Then - Should return 404 (not 403) to avoid leaking existence
  expect(response.status).toBe(404)
  expect(response.body.error).toBe('Search not found')
}

export const scopeAllPlaces = async () => {
  // Given - User with places in lists, searches, and unassociated
  const user = await createUser()
  const places = await seedPlaces(user.id, [
    { name: 'Place in List', country: 'France' },
    { name: 'Place in Search', country: 'Germany' },
    { name: 'Standalone Place', country: 'Spain' },
  ])

  const list = await seedList(user.id, { name: 'My List' })
  const search = await seedSearch(user.id, { keyword: 'test' })

  await seedListPlace(list.id, places[0].userPlaceId)
  await seedSearchPlace(search.id, places[1].userPlaceId)

  // When - Query without scope params (all places mode)
  const response = await createApiClient(user.id).userPlaces.markers({})

  // Then - Should return ALL user's places as markers
  assertOk(response)
  expect(response.body.markers).toHaveLength(3)
  expect(response.body.totalCount).toBe(3)
}
