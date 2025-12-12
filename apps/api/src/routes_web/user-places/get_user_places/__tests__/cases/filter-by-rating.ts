import { seedPlaces } from '../../../../../__tests__/integration/seeders/place-seeder'
import { createApiClient } from '../../../../../__tests__/integration/utils/api-client'
import {
  assertAllMatch,
  assertLength,
  assertOk,
} from '../../../../../__tests__/integration/utils/assertions'
import { createUser } from '../../../../../__tests__/integration/utils/user-manager'

export const filterByRatingRange = async () => {
  // Given
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: 'Low Rated', country: 'France', rating: 2.0 },
    { name: 'Medium Rated', country: 'France', rating: 3.5 },
    { name: 'High Rated', country: 'France', rating: 4.8 },
  ])

  // When
  const response = await createApiClient(user.id).userPlaces.get({
    ratingMin: 3,
    ratingMax: 4,
  })

  // Then
  assertOk(response)
  assertLength('Only medium rated place in range', response.body.items, 1)
  assertAllMatch(
    'Rating is between 3 and 4',
    response.body.items,
    (item: { rating: number }) => item.rating >= 3 && item.rating <= 4,
  )
}

export const filterByMinRating = async () => {
  // Given
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: 'Low Rated', country: 'France', rating: 2.0 },
    { name: 'Medium Rated', country: 'France', rating: 3.5 },
    { name: 'High Rated', country: 'France', rating: 4.8 },
  ])

  // When
  const response = await createApiClient(user.id).userPlaces.get({
    ratingMin: 4,
  })

  // Then
  assertOk(response)
  assertLength('Only high rated place', response.body.items, 1)
}

export const filterByRatingCount = async () => {
  // Given
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: 'Few Reviews', country: 'France', ratingCount: 5 },
    { name: 'Some Reviews', country: 'France', ratingCount: 50 },
    { name: 'Many Reviews', country: 'France', ratingCount: 500 },
  ])

  // When
  const response = await createApiClient(user.id).userPlaces.get({
    ratingCountMin: 10,
    ratingCountMax: 100,
  })

  // Then
  assertOk(response)
  assertLength('Only place with 50 reviews', response.body.items, 1)
}
