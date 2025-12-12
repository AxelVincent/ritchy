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
import {
  assertAllMatch,
  assertLength,
  assertOk,
} from '../../../../../__tests__/integration/utils/assertions'
import { createUser } from '../../../../../__tests__/integration/utils/user-manager'

export const scopeByListId = async () => {
  // Given - User with places in different lists
  const user = await createUser()
  const places = await seedPlaces(user.id, [
    { name: 'Place in List A', country: 'France' },
    { name: 'Place in List B', country: 'France' },
    { name: 'Place in List A too', country: 'France' },
  ])

  const listA = await seedList(user.id, { name: 'List A', emoji: '🅰️' })
  const listB = await seedList(user.id, { name: 'List B', emoji: '🅱️' })

  await seedListPlace(listA.id, places[0].userPlaceId)
  await seedListPlace(listA.id, places[2].userPlaceId)
  await seedListPlace(listB.id, places[1].userPlaceId)

  // When - Query with listId filter
  const response = await createApiClient(user.id).userPlaces.get({
    listId: listA.id,
  })

  // Then
  assertOk(response)
  assertLength('Only places from List A', response.body.items, 2)
  assertAllMatch(
    'All places are from List A',
    response.body.items,
    (item: { name: string }) =>
      item.name === 'Place in List A' || item.name === 'Place in List A too',
  )
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

  // When - Query with searchId filter
  const response = await createApiClient(user.id).userPlaces.get({
    searchId: searchParis.id,
  })

  // Then
  assertOk(response)
  assertLength('Only places from Paris search', response.body.items, 2)
}

export const scopeListNotFound = async () => {
  // Given - User with no lists
  const user = await createUser()
  await seedPlaces(user.id, [{ name: 'Some Place', country: 'France' }])

  const nonExistentListId = crypto.randomUUID()

  // When - Query with non-existent listId
  const response = await createApiClient(user.id).userPlaces.get({
    listId: nonExistentListId,
  })

  // Then
  expect(response.status).toBe(404)
  expect(response.body.error).toBe('List not found')
}

export const scopeSearchNotFound = async () => {
  // Given - User with no searches
  const user = await createUser()
  await seedPlaces(user.id, [{ name: 'Some Place', country: 'France' }])

  const nonExistentSearchId = crypto.randomUUID()

  // When - Query with non-existent searchId
  const response = await createApiClient(user.id).userPlaces.get({
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
  const response = await createApiClient(user1.id).userPlaces.get({
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
  const response = await createApiClient(user1.id).userPlaces.get({
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
  const response = await createApiClient(user.id).userPlaces.get({})

  // Then - Should return ALL user's places
  assertOk(response)
  assertLength('All user places returned', response.body.items, 3)
}
