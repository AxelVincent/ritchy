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
  // Given - User with places in different lists with different countries
  const user = await createUser()
  const places = await seedPlaces(user.id, [
    { name: 'French Place', country: 'France' },
    { name: 'German Place', country: 'Germany' },
    { name: 'Another French', country: 'France' },
  ])

  const listFrance = await seedList(user.id, {
    name: 'France List',
    emoji: '🇫🇷',
  })
  const listGermany = await seedList(user.id, {
    name: 'Germany List',
    emoji: '🇩🇪',
  })

  await seedListPlace(listFrance.id, places[0].userPlaceId)
  await seedListPlace(listFrance.id, places[2].userPlaceId)
  await seedListPlace(listGermany.id, places[1].userPlaceId)

  // When - Query filter options with listId filter
  const response = await createApiClient(user.id).userPlaces.filterOptions({
    listId: listFrance.id,
  })

  // Then - Should only return options from places in that list
  assertOk(response)
  expect(response.body.country).toContain('France')
  expect(response.body.country).not.toContain('Germany')
}

export const scopeBySearchId = async () => {
  // Given - User with places in different searches with different localities
  const user = await createUser()
  const places = await seedPlaces(user.id, [
    { name: 'Paris Restaurant', locality: 'Paris' },
    { name: 'Berlin Cafe', locality: 'Berlin' },
    { name: 'Paris Bakery', locality: 'Paris' },
  ])

  const searchParis = await seedSearch(user.id, {
    keyword: 'restaurants paris',
  })
  const searchBerlin = await seedSearch(user.id, { keyword: 'cafes berlin' })

  await seedSearchPlace(searchParis.id, places[0].userPlaceId)
  await seedSearchPlace(searchParis.id, places[2].userPlaceId)
  await seedSearchPlace(searchBerlin.id, places[1].userPlaceId)

  // When - Query filter options with searchId filter
  const response = await createApiClient(user.id).userPlaces.filterOptions({
    searchId: searchParis.id,
  })

  // Then - Should only return options from places in that search
  assertOk(response)
  expect(response.body.locality).toContain('Paris')
  expect(response.body.locality).not.toContain('Berlin')
}

export const scopeListNotFound = async () => {
  // Given - User with places but querying non-existent list
  const user = await createUser()
  await seedPlaces(user.id, [{ name: 'Some Place', country: 'France' }])

  const nonExistentListId = crypto.randomUUID()

  // When - Query with non-existent listId
  const response = await createApiClient(user.id).userPlaces.filterOptions({
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
  const response = await createApiClient(user.id).userPlaces.filterOptions({
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
  const response = await createApiClient(user1.id).userPlaces.filterOptions({
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
  const response = await createApiClient(user1.id).userPlaces.filterOptions({
    searchId: user2Search.id,
  })

  // Then - Should return 404 (not 403) to avoid leaking existence
  expect(response.status).toBe(404)
  expect(response.body.error).toBe('Search not found')
}

export const scopeAllPlaces = async () => {
  // Given - User with places from different countries (some in lists, some not)
  const user = await createUser()
  const places = await seedPlaces(user.id, [
    { name: 'French in List', country: 'France' },
    { name: 'German in Search', country: 'Germany' },
    { name: 'Spanish Standalone', country: 'Spain' },
  ])

  const list = await seedList(user.id, { name: 'My List' })
  const search = await seedSearch(user.id, { keyword: 'test' })

  await seedListPlace(list.id, places[0].userPlaceId)
  await seedSearchPlace(search.id, places[1].userPlaceId)

  // When - Query without scope params (all places mode)
  const response = await createApiClient(user.id).userPlaces.filterOptions({})

  // Then - Should return options from ALL user's places
  assertOk(response)
  expect(response.body.country).toContain('France')
  expect(response.body.country).toContain('Germany')
  expect(response.body.country).toContain('Spain')
}
