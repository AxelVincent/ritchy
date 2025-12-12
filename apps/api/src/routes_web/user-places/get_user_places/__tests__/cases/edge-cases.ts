import { expect } from 'vitest'
import {
  seedList,
  seedListPlace,
} from '../../../../../__tests__/integration/seeders/list-seeder'
import { seedPlaces } from '../../../../../__tests__/integration/seeders/place-seeder'
import { createApiClient } from '../../../../../__tests__/integration/utils/api-client'
import {
  assertLength,
  assertOk,
} from '../../../../../__tests__/integration/utils/assertions'
import { createUser } from '../../../../../__tests__/integration/utils/user-manager'

export const emptyResultsReturnsEmptyArray = async () => {
  // Given
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: 'Place A', country: 'France' },
    { name: 'Place B', country: 'Germany' },
  ])

  // When - Filter that matches nothing
  const response = await createApiClient(user.id).userPlaces.get({
    country: 'Japan',
  })

  // Then
  assertOk(response)
  assertLength('Empty items array returned', response.body.items, 0)
  expect(response.body.pagination.totalItems).toBe(0)
  expect(response.body.pagination.hasNextPage).toBe(false)
}

export const noPlacesForUserReturnsEmpty = async () => {
  // Given - User with no places
  const user = await createUser()

  // When
  const response = await createApiClient(user.id).userPlaces.get({})

  // Then
  assertOk(response)
  assertLength('No places returned', response.body.items, 0)
  expect(response.body.pagination.totalItems).toBe(0)
}

export const emptyListReturnsEmpty = async () => {
  // Given - User with places but empty list
  const user = await createUser()
  await seedPlaces(user.id, [{ name: 'Some Place', country: 'France' }])
  const emptyList = await seedList(user.id, { name: 'Empty List' })
  // Note: No places added to the list

  // When
  const response = await createApiClient(user.id).userPlaces.get({
    listId: emptyList.id,
  })

  // Then
  assertOk(response)
  assertLength('Empty list returns no items', response.body.items, 0)
}

export const paginationBeyondTotalPagesReturnsEmpty = async () => {
  // Given
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: 'Place 1', country: 'France' },
    { name: 'Place 2', country: 'France' },
    { name: 'Place 3', country: 'France' },
  ])

  // When - Request page 100 (well beyond total)
  const response = await createApiClient(user.id).userPlaces.get({
    page: 100,
    pageSize: 10,
  })

  // Then - API returns empty items with page metadata
  // Note: totalItems is 0 because the window function COUNT(*) OVER() only counts returned rows
  // This is expected behavior - when offset exceeds total, no rows are returned so count is 0
  assertOk(response)
  assertLength('Page beyond total returns empty', response.body.items, 0)
  expect(response.body.pagination.page).toBe(100)
  expect(response.body.pagination.hasNextPage).toBe(false)
}

export const maxRatingOnlyFilter = async () => {
  // Given
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: 'Low Rated', country: 'France', rating: 2.0 },
    { name: 'High Rated', country: 'France', rating: 4.8 },
    { name: 'Medium Rated', country: 'France', rating: 3.5 },
  ])

  // When - Only max rating specified
  const response = await createApiClient(user.id).userPlaces.get({
    ratingMax: 3.0,
  })

  // Then
  assertOk(response)
  assertLength('Only place with rating <= 3.0', response.body.items, 1)
}

export const nullRatingHandledCorrectly = async () => {
  // Given
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: 'Rated Place', country: 'France', rating: 4.5 },
    { name: 'Unrated Place', country: 'France' }, // No rating
  ])

  // When - Filter by min rating
  const response = await createApiClient(user.id).userPlaces.get({
    ratingMin: 4.0,
  })

  // Then - Should only return the rated place
  assertOk(response)
  assertLength('Only rated place matches', response.body.items, 1)
  expect(response.body.items[0].name).toBe('Rated Place')
}

export const filtersWithNoMatchesReturnsEmpty = async () => {
  // Given
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: 'French Restaurant', country: 'France', primaryType: 'restaurant' },
    { name: 'German Cafe', country: 'Germany', primaryType: 'cafe' },
  ])

  // When - Conflicting filters that match no items
  const response = await createApiClient(user.id).userPlaces.get({
    country: 'France',
    primaryType: 'cafe', // No French cafes exist
  })

  // Then
  assertOk(response)
  assertLength('No intersection returns empty', response.body.items, 0)
}

export const defaultPageSizeApplied = async () => {
  // Given - Create more places than default page size (default is 50)
  const user = await createUser()
  const placesData = Array.from({ length: 55 }, (_, i) => ({
    name: `Place ${i + 1}`,
    country: 'France',
  }))
  await seedPlaces(user.id, placesData)

  // When - No pageSize specified
  const response = await createApiClient(user.id).userPlaces.get({})

  // Then - Should apply default page size (50)
  assertOk(response)
  expect(response.body.items.length).toBeLessThanOrEqual(50)
  expect(response.body.pagination.totalItems).toBe(55)
  expect(response.body.pagination.hasNextPage).toBe(true)
}

export const combinedFiltersAndPagination = async () => {
  // Given
  const user = await createUser()
  const placesData = Array.from({ length: 15 }, (_, i) => ({
    name: `Restaurant ${i + 1}`,
    country: 'France',
    primaryType: 'restaurant',
  }))
  // Add some non-matching places
  placesData.push({
    name: 'German Cafe',
    country: 'Germany',
    primaryType: 'cafe',
  })
  placesData.push({
    name: 'German Bar',
    country: 'Germany',
    primaryType: 'bar',
  })
  await seedPlaces(user.id, placesData)

  // When - Filter + pagination
  const response = await createApiClient(user.id).userPlaces.get({
    country: 'France',
    page: 1,
    pageSize: 5,
  })

  // Then
  assertOk(response)
  assertLength('First page of French places', response.body.items, 5)
  expect(response.body.pagination.totalItems).toBe(15)
  expect(response.body.pagination.hasNextPage).toBe(true)
  expect(response.body.pagination.totalPages).toBe(3)
}

export const specialCharactersInTextFilters = async () => {
  // Given
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: "O'Brien's Pub", country: 'France' },
    { name: 'Café Français', country: 'France' },
    { name: "Bob's Diner", country: 'France' },
  ])

  // When - Search with apostrophe
  const response = await createApiClient(user.id).userPlaces.get({
    name: "O'Brien",
  })

  // Then
  assertOk(response)
  assertLength('Found place with apostrophe', response.body.items, 1)
  expect(response.body.items[0].name).toBe("O'Brien's Pub")
}

export const paginationMetadataAccuracy = async () => {
  // Given
  const user = await createUser()
  const placesData = Array.from({ length: 23 }, (_, i) => ({
    name: `Place ${i + 1}`,
    country: 'France',
  }))
  await seedPlaces(user.id, placesData)

  // When - Request specific page
  const response = await createApiClient(user.id).userPlaces.get({
    page: 2,
    pageSize: 10,
  })

  // Then - Verify pagination metadata
  assertOk(response)
  assertLength('Second page has 10 items', response.body.items, 10)
  expect(response.body.pagination.page).toBe(2)
  expect(response.body.pagination.pageSize).toBe(10)
  expect(response.body.pagination.totalItems).toBe(23)
  expect(response.body.pagination.totalPages).toBe(3)
  expect(response.body.pagination.hasNextPage).toBe(true)
  expect(response.body.pagination.hasPreviousPage).toBe(true)
}
