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

export const contextTypeAll = async () => {
  // Given
  const user = await createUser()
  await seedPlaces(user.id, [{ name: 'Some Place', country: 'France' }])

  // When - Query without scope params
  const response = await createApiClient(user.id).userPlaces.get({})

  // Then
  assertOk(response)
  expect(response.body.context).toBeDefined()
  expect(response.body.context.type).toBe('all')
  // All mode should not have list or search metadata
  expect(response.body.context.listId).toBeUndefined()
  expect(response.body.context.searchId).toBeUndefined()
}

export const contextTypeList = async () => {
  // Given
  const user = await createUser()
  const places = await seedPlaces(user.id, [
    { name: 'Listed Place', country: 'France' },
  ])
  const list = await seedList(user.id, { name: 'My Leads', emoji: '🎯' })
  await seedListPlace(list.id, places[0].userPlaceId)

  // When - Query scoped to list
  const response = await createApiClient(user.id).userPlaces.get({
    listId: list.id,
  })

  // Then
  assertOk(response)
  expect(response.body.context).toBeDefined()
  expect(response.body.context.type).toBe('list')
  expect(response.body.context.listId).toBe(list.id)
  expect(response.body.context.listName).toBe('My Leads')
  expect(response.body.context.listEmoji).toBe('🎯')
  expect(response.body.context.listCreatedAt).toBeDefined()
  expect(response.body.context.listUpdatedAt).toBeDefined()
  // Should not have search metadata
  expect(response.body.context.searchId).toBeUndefined()
}

export const contextTypeSearch = async () => {
  // Given
  const user = await createUser()
  const places = await seedPlaces(user.id, [
    { name: 'Search Result', country: 'France' },
  ])
  const search = await seedSearch(user.id, {
    keyword: 'restaurants near paris',
    placeName: 'Paris',
  })
  await seedSearchPlace(search.id, places[0].userPlaceId)

  // When - Query scoped to search
  const response = await createApiClient(user.id).userPlaces.get({
    searchId: search.id,
  })

  // Then
  assertOk(response)
  expect(response.body.context).toBeDefined()
  expect(response.body.context.type).toBe('search')
  expect(response.body.context.searchId).toBe(search.id)
  expect(response.body.context.searchKeyword).toBe('restaurants near paris')
  expect(response.body.context.searchModel).toBe('BASIC')
  expect(response.body.context.searchCreatedAt).toBeDefined()
  // Should not have list metadata
  expect(response.body.context.listId).toBeUndefined()
}
