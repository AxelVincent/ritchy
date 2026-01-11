import { seedEnrichment } from '../../../../../__tests__/integration/seeders/enrichment-seeder'
import { seedPlaces } from '../../../../../__tests__/integration/seeders/place-seeder'
import { createApiClient } from '../../../../../__tests__/integration/utils/api-client'
import {
  assertLength,
  assertOk,
} from '../../../../../__tests__/integration/utils/assertions'
import { createUser } from '../../../../../__tests__/integration/utils/user-manager'

export const filterCombined = async () => {
  // Given
  const user = await createUser()
  const places = await seedPlaces(user.id, [
    {
      name: 'Target Place',
      country: 'France',
      rating: 4.5,
      status: 'NEW',
    },
    {
      name: 'Wrong Country',
      country: 'Germany',
      rating: 4.5,
      status: 'NEW',
    },
    {
      name: 'Wrong Rating',
      country: 'France',
      rating: 2.0,
      status: 'NEW',
    },
    {
      name: 'Wrong Status',
      country: 'France',
      rating: 4.5,
      status: 'LOST',
    },
  ])

  // Add enrichment to target
  await seedEnrichment(places[0].placeId, places[0].userPlaceId, {
    workforceRange: '10-50',
  })

  // When
  const response = await createApiClient(user.id).userPlaces.get({
    country: 'France',
    ratingMin: 4,
    status: 'NEW',
  })

  // Then
  assertOk(response)
  assertLength('Only target place matches all criteria', response.body.items, 1)
}

export const filterCombinedWithEnrichment = async () => {
  // Given
  const user = await createUser()
  const places = await seedPlaces(user.id, [
    { name: 'Target', country: 'France', rating: 4.5 },
    { name: 'No Enrichment', country: 'France', rating: 4.5 },
    { name: 'Wrong Workforce', country: 'France', rating: 4.5 },
  ])

  await seedEnrichment(places[0].placeId, places[0].userPlaceId, {
    workforceRange: '10-50',
    technologies: ['Shopify'],
  })
  await seedEnrichment(places[2].placeId, places[2].userPlaceId, {
    workforceRange: '100-500',
    technologies: ['WordPress'],
  })

  // When
  const response = await createApiClient(user.id).userPlaces.get({
    country: 'France',
    workforceRange: '10-50',
  })

  // Then
  assertOk(response)
  assertLength('Only place with correct workforce', response.body.items, 1)
}
