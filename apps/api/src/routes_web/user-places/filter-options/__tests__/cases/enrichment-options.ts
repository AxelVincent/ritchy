import { expect } from 'vitest'
import { seedEnrichment } from '../../../../../__tests__/integration/seeders/enrichment-seeder'
import { seedPlaces } from '../../../../../__tests__/integration/seeders/place-seeder'
import { createApiClient } from '../../../../../__tests__/integration/utils/api-client'
import { assertOk } from '../../../../../__tests__/integration/utils/assertions'
import { createUser } from '../../../../../__tests__/integration/utils/user-manager'

export const workforceRangeOptionsUnique = async () => {
  // Given - User with enriched places having different workforce ranges
  const user = await createUser()
  const places = await seedPlaces(user.id, [
    { name: 'Small Company' },
    { name: 'Medium Company' },
    { name: 'Another Small' },
  ])

  await seedEnrichment(places[0].placeId, places[0].userPlaceId, {
    workforceRange: '1-10',
  })
  await seedEnrichment(places[1].placeId, places[1].userPlaceId, {
    workforceRange: '11-50',
  })
  await seedEnrichment(places[2].placeId, places[2].userPlaceId, {
    workforceRange: '1-10', // Duplicate
  })

  // When
  const response = await createApiClient(user.id).userPlaces.filterOptions({})

  // Then
  assertOk(response)
  expect(response.body.workforceRange).toContain('1-10')
  expect(response.body.workforceRange).toContain('11-50')
  // Check uniqueness
  const uniqueRanges = new Set(response.body.workforceRange)
  expect(response.body.workforceRange.length).toBe(uniqueRanges.size)
}

export const technologiesOptionsUnique = async () => {
  // Given - User with enriched places having different technologies
  const user = await createUser()
  const places = await seedPlaces(user.id, [
    { name: 'Tech Company A' },
    { name: 'Tech Company B' },
  ])

  await seedEnrichment(places[0].placeId, places[0].userPlaceId, {
    technologies: ['React', 'Node.js', 'PostgreSQL'],
  })
  await seedEnrichment(places[1].placeId, places[1].userPlaceId, {
    technologies: ['React', 'Python', 'MongoDB'], // React is duplicate
  })

  // When
  const response = await createApiClient(user.id).userPlaces.filterOptions({})

  // Then - Should flatten and return unique technologies
  assertOk(response)
  expect(response.body.technologies).toContain('React')
  expect(response.body.technologies).toContain('Node.js')
  expect(response.body.technologies).toContain('PostgreSQL')
  expect(response.body.technologies).toContain('Python')
  expect(response.body.technologies).toContain('MongoDB')
  // Check uniqueness
  const uniqueTechs = new Set(response.body.technologies)
  expect(response.body.technologies.length).toBe(uniqueTechs.size)
}

export const noEnrichmentReturnsEmptyArrays = async () => {
  // Given - User with places that have NO enrichment data
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: 'Non-enriched Place 1' },
    { name: 'Non-enriched Place 2' },
  ])
  // No enrichment seeded

  // When
  const response = await createApiClient(user.id).userPlaces.filterOptions({})

  // Then - Enrichment fields should be empty arrays
  assertOk(response)
  expect(response.body.workforceRange).toEqual([])
  expect(response.body.technologies).toEqual([])
}
