import { seedPlaces } from '../../../../../__tests__/integration/seeders/place-seeder'
import { createApiClient } from '../../../../../__tests__/integration/utils/api-client'
import {
  assertAllMatch,
  assertLength,
  assertOk,
} from '../../../../../__tests__/integration/utils/assertions'
import { createUser } from '../../../../../__tests__/integration/utils/user-manager'

export const filterByName = async () => {
  // Given
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: 'Acme Coffee Shop', country: 'France' },
    { name: 'Beta Restaurant', country: 'France' },
    { name: 'Coffee House Express', country: 'France' },
  ])

  // When
  const response = await createApiClient(user.id).userPlaces.get({
    name: 'Coffee',
  })

  // Then
  assertOk(response)
  assertLength('Only places with Coffee in name', response.body.items, 2)
  assertAllMatch(
    'All places contain Coffee in name',
    response.body.items,
    (item: { name: string }) => item.name.toLowerCase().includes('coffee'),
  )
}

export const filterByNameCaseInsensitive = async () => {
  // Given
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: 'ACME BAKERY', country: 'France' },
    { name: 'acme restaurant', country: 'France' },
    { name: 'Beta Cafe', country: 'France' },
  ])

  // When
  const response = await createApiClient(user.id).userPlaces.get({
    name: 'acme',
  })

  // Then
  assertOk(response)
  assertLength('Case-insensitive name match', response.body.items, 2)
}
