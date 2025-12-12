import { expect } from 'vitest'
import { seedPlaces } from '../../../../../__tests__/integration/seeders/place-seeder'
import { createApiClient } from '../../../../../__tests__/integration/utils/api-client'
import {
  assertLength,
  assertOk,
} from '../../../../../__tests__/integration/utils/assertions'
import { createUser } from '../../../../../__tests__/integration/utils/user-manager'

export const pagination = async () => {
  // Given
  const user = await createUser()
  await seedPlaces(
    user.id,
    Array.from({ length: 15 }, (_, i) => ({
      name: `Place ${i + 1}`,
      country: 'France',
    })),
  )

  // When - get first page
  const response = await createApiClient(user.id).userPlaces.get({
    page: 1,
    pageSize: 5,
  })

  // Then
  assertOk(response)
  assertLength('First page has 5 items', response.body.items, 5)
  expect(response.body.pagination.totalItems).toBe(15)
  expect(response.body.pagination.totalPages).toBe(3)
  expect(response.body.pagination.hasNextPage).toBe(true)
  expect(response.body.pagination.hasPreviousPage).toBe(false)
}

export const paginationSecondPage = async () => {
  // Given
  const user = await createUser()
  await seedPlaces(
    user.id,
    Array.from({ length: 15 }, (_, i) => ({
      name: `Place ${i + 1}`,
      country: 'France',
    })),
  )

  // When - get second page
  const response = await createApiClient(user.id).userPlaces.get({
    page: 2,
    pageSize: 5,
  })

  // Then
  assertOk(response)
  assertLength('Second page has 5 items', response.body.items, 5)
  expect(response.body.pagination.hasNextPage).toBe(true)
  expect(response.body.pagination.hasPreviousPage).toBe(true)
}

export const paginationLastPage = async () => {
  // Given
  const user = await createUser()
  await seedPlaces(
    user.id,
    Array.from({ length: 12 }, (_, i) => ({
      name: `Place ${i + 1}`,
      country: 'France',
    })),
  )

  // When - get last page
  const response = await createApiClient(user.id).userPlaces.get({
    page: 3,
    pageSize: 5,
  })

  // Then
  assertOk(response)
  assertLength('Last page has 2 items', response.body.items, 2)
  expect(response.body.pagination.hasNextPage).toBe(false)
  expect(response.body.pagination.hasPreviousPage).toBe(true)
}
