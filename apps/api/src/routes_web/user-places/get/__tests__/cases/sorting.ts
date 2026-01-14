import { expect } from 'vitest'
import {
  seedList,
  seedListPlace,
} from '../../../../../__tests__/integration/seeders/list-seeder'
import { seedPlaces } from '../../../../../__tests__/integration/seeders/place-seeder'
import { createApiClient } from '../../../../../__tests__/integration/utils/api-client'
import {
  assertOk,
  assertSortedBy,
} from '../../../../../__tests__/integration/utils/assertions'
import { createUser } from '../../../../../__tests__/integration/utils/user-manager'

export const sortByRating = async () => {
  // Given
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: 'Low Rated', country: 'France', rating: 2.0 },
    { name: 'High Rated', country: 'France', rating: 4.8 },
    { name: 'Medium Rated', country: 'France', rating: 3.5 },
  ])

  // When
  const response = await createApiClient(user.id).userPlaces.get({
    sortBy: 'rating',
    sortOrder: 'desc',
  })

  // Then
  assertOk(response)
  assertSortedBy(response.body.items, 'rating', 'desc')
}

export const sortByRatingAsc = async () => {
  // Given
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: 'Low Rated', country: 'France', rating: 2.0 },
    { name: 'High Rated', country: 'France', rating: 4.8 },
    { name: 'Medium Rated', country: 'France', rating: 3.5 },
  ])

  // When
  const response = await createApiClient(user.id).userPlaces.get({
    sortBy: 'rating',
    sortOrder: 'asc',
  })

  // Then
  assertOk(response)
  assertSortedBy(response.body.items, 'rating', 'asc')
}

export const sortByName = async () => {
  // Given
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: 'Zebra Cafe', country: 'France' },
    { name: 'Alpha Restaurant', country: 'France' },
    { name: 'Mango Bakery', country: 'France' },
  ])

  // When
  const response = await createApiClient(user.id).userPlaces.get({
    sortBy: 'name',
    sortOrder: 'asc',
  })

  // Then
  assertOk(response)
  assertSortedBy(response.body.items, 'name', 'asc')
}

export const sortByRatingCount = async () => {
  // Given
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: 'Few Reviews', country: 'France', ratingCount: 10 },
    { name: 'Many Reviews', country: 'France', ratingCount: 500 },
    { name: 'Medium Reviews', country: 'France', ratingCount: 100 },
  ])

  // When
  const response = await createApiClient(user.id).userPlaces.get({
    sortBy: 'ratingCount',
    sortOrder: 'desc',
  })

  // Then
  assertOk(response)
  assertSortedBy(response.body.items, 'ratingCount', 'desc')
}

export const sortByStatusAscAndDesc = async () => {
  // Given - Use list scope as "all places" mode doesn't support custom sorting
  const user = await createUser()
  const places = await seedPlaces(user.id, [
    { name: 'Won Lead', country: 'France', status: 'WON' },
    { name: 'New Lead', country: 'France', status: 'NEW' },
    { name: 'Contacted Lead', country: 'France', status: 'CONTACTED' },
  ])

  // Create a list and add all places to it
  const list = await seedList(user.id, { name: 'Test List' })
  for (const p of places) {
    await seedListPlace(list.id, p.userPlaceId)
  }

  // When - Query ASC and DESC
  const responseAsc = await createApiClient(user.id).userPlaces.get({
    listId: list.id,
    sortBy: 'status',
    sortOrder: 'asc',
  })

  const responseDesc = await createApiClient(user.id).userPlaces.get({
    listId: list.id,
    sortBy: 'status',
    sortOrder: 'desc',
  })

  // Then - ASC and DESC should be opposite orders
  assertOk(responseAsc)
  assertOk(responseDesc)
  expect(responseAsc.body.items).toHaveLength(3)
  expect(responseDesc.body.items).toHaveLength(3)

  // The first item in ASC should be the last in DESC
  expect(responseAsc.body.items[0].status).toBe(
    responseDesc.body.items[2].status,
  )
  // The last item in ASC should be the first in DESC
  expect(responseAsc.body.items[2].status).toBe(
    responseDesc.body.items[0].status,
  )
}

export const sortByCountry = async () => {
  // Given
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: 'German Place', country: 'Germany' },
    { name: 'French Place', country: 'France' },
    { name: 'Spanish Place', country: 'Spain' },
  ])

  // When
  const response = await createApiClient(user.id).userPlaces.get({
    sortBy: 'country',
    sortOrder: 'asc',
  })

  // Then
  assertOk(response)
  // Should be alphabetical: France, Germany, Spain
  expect(response.body.items[0].address.country).toBe('France')
  expect(response.body.items[1].address.country).toBe('Germany')
  expect(response.body.items[2].address.country).toBe('Spain')
}

export const sortByLocality = async () => {
  // Given
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: 'Paris Place', country: 'France', locality: 'Paris' },
    { name: 'Lyon Place', country: 'France', locality: 'Lyon' },
    { name: 'Marseille Place', country: 'France', locality: 'Marseille' },
  ])

  // When
  const response = await createApiClient(user.id).userPlaces.get({
    sortBy: 'locality',
    sortOrder: 'asc',
  })

  // Then
  assertOk(response)
  // Should be alphabetical: Lyon, Marseille, Paris
  expect(response.body.items[0].address.locality).toBe('Lyon')
  expect(response.body.items[1].address.locality).toBe('Marseille')
  expect(response.body.items[2].address.locality).toBe('Paris')
}

export const sortByPrimaryType = async () => {
  // Given
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: 'Restaurant', country: 'France', primaryType: 'restaurant' },
    { name: 'Cafe', country: 'France', primaryType: 'cafe' },
    { name: 'Bar', country: 'France', primaryType: 'bar' },
  ])

  // When
  const response = await createApiClient(user.id).userPlaces.get({
    sortBy: 'primaryType',
    sortOrder: 'asc',
  })

  // Then
  assertOk(response)
  // Should be alphabetical: bar, cafe, restaurant
  expect(response.body.items[0].primaryType).toBe('bar')
  expect(response.body.items[1].primaryType).toBe('cafe')
  expect(response.body.items[2].primaryType).toBe('restaurant')
}

export const sortByInvalidColumnFallsBackToDefault = async () => {
  // Given
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: 'Place A', country: 'France' },
    { name: 'Place B', country: 'France' },
    { name: 'Place C', country: 'France' },
  ])

  // When - Using an invalid sort column
  const response = await createApiClient(user.id).userPlaces.get({
    sortBy: 'nonexistent_column',
    sortOrder: 'desc',
  })

  // Then - Should still return results (falls back to default sort)
  assertOk(response)
  expect(response.body.items).toHaveLength(3)
}
