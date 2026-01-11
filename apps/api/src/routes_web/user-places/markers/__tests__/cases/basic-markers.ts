import { expect } from 'vitest'
import { seedPlaces } from '../../../../../__tests__/integration/seeders/place-seeder'
import { createApiClient } from '../../../../../__tests__/integration/utils/api-client'
import { assertOk } from '../../../../../__tests__/integration/utils/assertions'
import { createUser } from '../../../../../__tests__/integration/utils/user-manager'

interface Marker {
  id: string
  name: string
  status: string | null
  location: { latitude: number; longitude: number }
}

export const markerContainsRequiredFields = async () => {
  // Given - User with a place
  const user = await createUser()
  await seedPlaces(user.id, [{ name: 'Test Restaurant', status: 'CONTACTED' }])

  // When
  const response = await createApiClient(user.id).userPlaces.markers({})

  // Then - Each marker should have required fields
  assertOk(response)
  expect(response.body.markers).toHaveLength(1)

  const marker: Marker = response.body.markers[0]
  expect(marker.id).toBeDefined()
  expect(typeof marker.id).toBe('string')
  expect(marker.name).toBe('Test Restaurant')
  expect(marker.status).toBe('CONTACTED')
  expect(marker.location).toBeDefined()
  expect(typeof marker.location.latitude).toBe('number')
  expect(typeof marker.location.longitude).toBe('number')
}

export const markerStatusIsNullWhenNotSet = async () => {
  // Given - User with a place that has no explicit status
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: 'New Place' }, // No status set
  ])

  // When
  const response = await createApiClient(user.id).userPlaces.markers({})

  // Then - Status should be null (not undefined or default)
  assertOk(response)
  expect(response.body.markers).toHaveLength(1)
  expect(response.body.markers[0].status).toBeNull()
}

export const markerLocationFromPlace = async () => {
  // Given - User with a place (seeder sets default location)
  const user = await createUser()
  await seedPlaces(user.id, [{ name: 'Paris Place' }])

  // When
  const response = await createApiClient(user.id).userPlaces.markers({})

  // Then - Location should be populated
  assertOk(response)
  expect(response.body.markers).toHaveLength(1)
  const marker: Marker = response.body.markers[0]
  // Seeder default location is Paris: 48.8566, 2.3522
  expect(marker.location.latitude).toBe(48.8566)
  expect(marker.location.longitude).toBe(2.3522)
}

export const totalCountMatchesMarkersLength = async () => {
  // Given - User with multiple places
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: 'Place 1' },
    { name: 'Place 2' },
    { name: 'Place 3' },
    { name: 'Place 4' },
    { name: 'Place 5' },
  ])

  // When
  const response = await createApiClient(user.id).userPlaces.markers({})

  // Then - totalCount should match actual markers length
  assertOk(response)
  expect(response.body.markers).toHaveLength(5)
  expect(response.body.totalCount).toBe(5)
  expect(response.body.totalCount).toBe(response.body.markers.length)
}

export const markersWithDifferentStatuses = async () => {
  // Given - User with places having different statuses
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: 'New Lead', status: 'NEW' },
    { name: 'Contacted Lead', status: 'CONTACTED' },
    { name: 'Won Deal', status: 'WON' },
    { name: 'Lost Deal', status: 'LOST' },
  ])

  // When
  const response = await createApiClient(user.id).userPlaces.markers({})

  // Then - Each marker should have its correct status
  assertOk(response)
  expect(response.body.markers).toHaveLength(4)

  const statusMap = new Map<string, string>()
  for (const marker of response.body.markers as Marker[]) {
    statusMap.set(marker.name, marker.status ?? 'null')
  }

  expect(statusMap.get('New Lead')).toBe('NEW')
  expect(statusMap.get('Contacted Lead')).toBe('CONTACTED')
  expect(statusMap.get('Won Deal')).toBe('WON')
  expect(statusMap.get('Lost Deal')).toBe('LOST')
}

export const markersReturnedForAllUserPlaces = async () => {
  // Given - User with many places
  const user = await createUser()
  const placesData = Array.from({ length: 25 }, (_, i) => ({
    name: `Place ${i + 1}`,
    country: 'France',
  }))
  await seedPlaces(user.id, placesData)

  // When - Query all markers (no pagination, unlike get_user_places)
  const response = await createApiClient(user.id).userPlaces.markers({})

  // Then - Should return ALL markers (markers endpoint has no pagination)
  assertOk(response)
  expect(response.body.markers).toHaveLength(25)
  expect(response.body.totalCount).toBe(25)
}
