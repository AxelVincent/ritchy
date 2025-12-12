import { seedEnrichment } from '../../../../../__tests__/integration/seeders/enrichment-seeder'
import { seedPlaces } from '../../../../../__tests__/integration/seeders/place-seeder'
import { createApiClient } from '../../../../../__tests__/integration/utils/api-client'
import {
  assertLength,
  assertOk,
} from '../../../../../__tests__/integration/utils/assertions'
import { createUser } from '../../../../../__tests__/integration/utils/user-manager'

export const filterByTechnologies = async () => {
  // Given
  const user = await createUser()
  const places = await seedPlaces(user.id, [
    { name: 'Shopify Store', country: 'France' },
    { name: 'WordPress Blog', country: 'France' },
    { name: 'Custom Site', country: 'France' },
  ])

  // Add enrichment with technologies
  await seedEnrichment(places[0].placeId, places[0].userPlaceId, {
    technologies: ['Shopify', 'Google Analytics'],
  })
  await seedEnrichment(places[1].placeId, places[1].userPlaceId, {
    technologies: ['WordPress', 'Google Analytics'],
  })
  await seedEnrichment(places[2].placeId, places[2].userPlaceId, {
    technologies: ['React', 'Node.js'],
  })

  // When
  const response = await createApiClient(user.id).userPlaces.get({
    technologies: ['Shopify'],
  })

  // Then
  assertOk(response)
  assertLength('Only place with Shopify', response.body.items, 1)
}

export const filterByMultipleTechnologies = async () => {
  // Given
  const user = await createUser()
  const places = await seedPlaces(user.id, [
    { name: 'Place A', country: 'France' },
    { name: 'Place B', country: 'France' },
    { name: 'Place C', country: 'France' },
  ])

  await seedEnrichment(places[0].placeId, places[0].userPlaceId, {
    technologies: ['Shopify'],
  })
  await seedEnrichment(places[1].placeId, places[1].userPlaceId, {
    technologies: ['WordPress'],
  })
  await seedEnrichment(places[2].placeId, places[2].userPlaceId, {
    technologies: ['React'],
  })

  // When - looking for places with Shopify OR WordPress
  const response = await createApiClient(user.id).userPlaces.get({
    technologies: ['Shopify', 'WordPress'],
  })

  // Then
  assertOk(response)
  assertLength('Places with Shopify or WordPress', response.body.items, 2)
}
