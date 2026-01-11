import { expect } from 'vitest'
import { seedPlaces } from '../../../../../__tests__/integration/seeders/place-seeder'
import { createApiClient } from '../../../../../__tests__/integration/utils/api-client'
import { createUser } from '../../../../../__tests__/integration/utils/user-manager'

export const invalidListIdFormat = async () => {
  // Given
  const user = await createUser()
  await seedPlaces(user.id, [{ name: 'Some Place', country: 'France' }])

  // When - Query with invalid UUID format for listId
  const response = await createApiClient(user.id).userPlaces.get({
    listId: 'not-a-valid-uuid',
  })

  // Then
  expect(response.status).toBe(400)
  expect(response.body.error).toBe('Invalid query parameters')
}

export const invalidSearchIdFormat = async () => {
  // Given
  const user = await createUser()
  await seedPlaces(user.id, [{ name: 'Some Place', country: 'France' }])

  // When - Query with invalid UUID format for searchId
  const response = await createApiClient(user.id).userPlaces.get({
    searchId: 'invalid-uuid-format',
  })

  // Then
  expect(response.status).toBe(400)
  expect(response.body.error).toBe('Invalid query parameters')
}

export const invalidPageNumber = async () => {
  // Given
  const user = await createUser()
  await seedPlaces(user.id, [{ name: 'Some Place', country: 'France' }])

  // When - Query with page < 1
  const response = await createApiClient(user.id).userPlaces.get({
    page: 0,
  })

  // Then
  expect(response.status).toBe(400)
  expect(response.body.error).toBe('Invalid query parameters')
}

export const invalidPageSizeExceedsMax = async () => {
  // Given
  const user = await createUser()
  await seedPlaces(user.id, [{ name: 'Some Place', country: 'France' }])

  // When - Query with pageSize > 100
  const response = await createApiClient(user.id).userPlaces.get({
    pageSize: 101,
  })

  // Then
  expect(response.status).toBe(400)
  expect(response.body.error).toBe('Invalid query parameters')
}

export const invalidRatingMinExceedsMax = async () => {
  // Given
  const user = await createUser()
  await seedPlaces(user.id, [{ name: 'Some Place', country: 'France' }])

  // When - Query with ratingMin > 5
  const response = await createApiClient(user.id).userPlaces.get({
    ratingMin: 6,
  })

  // Then
  expect(response.status).toBe(400)
  expect(response.body.error).toBe('Invalid query parameters')
}

export const invalidRatingMaxBelowMin = async () => {
  // Given
  const user = await createUser()
  await seedPlaces(user.id, [{ name: 'Some Place', country: 'France' }])

  // When - Query with ratingMax < 0
  const response = await createApiClient(user.id).userPlaces.get({
    ratingMax: -1,
  })

  // Then
  expect(response.status).toBe(400)
  expect(response.body.error).toBe('Invalid query parameters')
}

export const invalidSortOrder = async () => {
  // Given
  const user = await createUser()
  await seedPlaces(user.id, [{ name: 'Some Place', country: 'France' }])

  // When - Query with invalid sortOrder
  const response = await createApiClient(user.id).userPlaces.get({
    sortOrder: 'invalid',
  })

  // Then
  expect(response.status).toBe(400)
  expect(response.body.error).toBe('Invalid query parameters')
}

export const invalidRatingCountMinNegative = async () => {
  // Given
  const user = await createUser()
  await seedPlaces(user.id, [{ name: 'Some Place', country: 'France' }])

  // When - Query with negative ratingCountMin
  const response = await createApiClient(user.id).userPlaces.get({
    ratingCountMin: -5,
  })

  // Then
  expect(response.status).toBe(400)
  expect(response.body.error).toBe('Invalid query parameters')
}
