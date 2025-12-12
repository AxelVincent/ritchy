import { seedContact } from '../../../../../__tests__/integration/seeders/contact-seeder'
import { seedPlaces } from '../../../../../__tests__/integration/seeders/place-seeder'
import { createApiClient } from '../../../../../__tests__/integration/utils/api-client'
import {
  assertLength,
  assertOk,
} from '../../../../../__tests__/integration/utils/assertions'
import { createUser } from '../../../../../__tests__/integration/utils/user-manager'

export const filterByEmail = async () => {
  // Given
  const user = await createUser()
  const places = await seedPlaces(user.id, [
    { name: 'Place A', country: 'France' },
    { name: 'Place B', country: 'France' },
    { name: 'Place C', country: 'France' },
  ])

  // Add contacts with emails
  await seedContact(places[0].userPlaceId, { email: 'john@acme.com' })
  await seedContact(places[1].userPlaceId, { email: 'jane@beta.com' })
  await seedContact(places[2].userPlaceId, { email: 'bob@acme.org' })

  // When
  const response = await createApiClient(user.id).userPlaces.get({
    email: 'acme',
  })

  // Then
  assertOk(response)
  assertLength('Only places with acme in email', response.body.items, 2)
}

export const filterByEmailExactDomain = async () => {
  // Given
  const user = await createUser()
  const places = await seedPlaces(user.id, [
    { name: 'Place A', country: 'France' },
    { name: 'Place B', country: 'France' },
  ])

  await seedContact(places[0].userPlaceId, { email: 'contact@example.com' })
  await seedContact(places[1].userPlaceId, { email: 'info@different.com' })

  // When
  const response = await createApiClient(user.id).userPlaces.get({
    email: 'example.com',
  })

  // Then
  assertOk(response)
  assertLength('Only place with example.com email', response.body.items, 1)
}
