import { seedPlaces } from '../../../../../__tests__/integration/seeders/place-seeder'
import { createApiClient } from '../../../../../__tests__/integration/utils/api-client'
import {
  assertAllMatch,
  assertLength,
  assertOk,
} from '../../../../../__tests__/integration/utils/assertions'
import { createUser } from '../../../../../__tests__/integration/utils/user-manager'

export const filterBySingleCountry = async () => {
  // Given
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: 'Paris Café', country: 'France' },
    { name: 'Berlin Restaurant', country: 'Germany' },
    { name: 'Lyon Bakery', country: 'France' },
  ])

  // When
  const response = await createApiClient(user.id).userPlaces.get({
    country: 'France',
  })

  // Then
  assertOk(response)
  assertLength('Only French places returned', response.body.items, 2)
  assertAllMatch(
    'All places are from France',
    response.body.items,
    (item: { address: { country: string } }) =>
      item.address.country === 'France',
  )
}

export const filterByMultipleCountries = async () => {
  // Given
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: 'Paris Café', country: 'France' },
    { name: 'Berlin Restaurant', country: 'Germany' },
    { name: 'Madrid Bar', country: 'Spain' },
  ])

  // When
  const response = await createApiClient(user.id).userPlaces.get({
    country: ['France', 'Germany'],
  })

  // Then
  assertOk(response)
  assertLength('French and German places returned', response.body.items, 2)
}
