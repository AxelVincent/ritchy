import { expect } from 'vitest'
import { seedEnrichment } from '../../../../../__tests__/integration/seeders/enrichment-seeder'
import {
  seedList,
  seedListPlace,
} from '../../../../../__tests__/integration/seeders/list-seeder'
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

export const filterByStatus = async () => {
  // Given - User with places having different statuses
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: 'New Place', status: 'NEW' },
    { name: 'Contacted Place', status: 'CONTACTED' },
    { name: 'Another New', status: 'NEW' },
  ])

  // When - Filter by status
  const response = await createApiClient(user.id).userPlaces.markers({
    status: 'NEW',
  })

  // Then
  assertOk(response)
  expect(response.body.markers).toHaveLength(2)
  for (const marker of response.body.markers as Marker[]) {
    expect(marker.status).toBe('NEW')
  }
}

export const filterByMultipleStatuses = async () => {
  // Given - User with places having different statuses
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: 'New Place', status: 'NEW' },
    { name: 'Contacted Place', status: 'CONTACTED' },
    { name: 'Won Place', status: 'WON' },
    { name: 'Lost Place', status: 'LOST' },
  ])

  // When - Filter by multiple statuses
  const response = await createApiClient(user.id).userPlaces.markers({
    status: ['NEW', 'WON'],
  })

  // Then
  assertOk(response)
  expect(response.body.markers).toHaveLength(2)
  const statuses = (response.body.markers as Marker[]).map((m) => m.status)
  expect(statuses).toContain('NEW')
  expect(statuses).toContain('WON')
}

export const filterByName = async () => {
  // Given - User with places having different names
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: 'Best Pizza Place' },
    { name: 'Sushi Restaurant' },
    { name: 'Pizza Express' },
  ])

  // When - Filter by name (partial match)
  const response = await createApiClient(user.id).userPlaces.markers({
    name: 'Pizza',
  })

  // Then
  assertOk(response)
  expect(response.body.markers).toHaveLength(2)
  for (const marker of response.body.markers as Marker[]) {
    expect(marker.name.toLowerCase()).toContain('pizza')
  }
}

export const filterByCountry = async () => {
  // Given - User with places in different countries
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: 'Paris Place', country: 'France' },
    { name: 'Berlin Place', country: 'Germany' },
    { name: 'Lyon Place', country: 'France' },
  ])

  // When - Filter by country (as array for multi-select filter)
  const response = await createApiClient(user.id).userPlaces.markers({
    country: ['France'],
  })

  // Then
  assertOk(response)
  expect(response.body.markers).toHaveLength(2)
  const names = (response.body.markers as Marker[]).map((m) => m.name)
  expect(names).toContain('Paris Place')
  expect(names).toContain('Lyon Place')
}

export const filterByLocality = async () => {
  // Given - User with places in different localities
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: 'Montmartre Cafe', locality: 'Paris' },
    { name: 'Kreuzberg Bar', locality: 'Berlin' },
    { name: 'Le Marais Bistro', locality: 'Paris' },
  ])

  // When - Filter by locality (as array for multi-select filter)
  const response = await createApiClient(user.id).userPlaces.markers({
    locality: ['Paris'],
  })

  // Then
  assertOk(response)
  expect(response.body.markers).toHaveLength(2)
  const names = (response.body.markers as Marker[]).map((m) => m.name)
  expect(names).toContain('Montmartre Cafe')
  expect(names).toContain('Le Marais Bistro')
}

export const filterByPrimaryType = async () => {
  // Given - User with places of different types
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: 'Italian Restaurant', primaryType: 'restaurant' },
    { name: 'Coffee Shop', primaryType: 'cafe' },
    { name: 'French Restaurant', primaryType: 'restaurant' },
  ])

  // When - Filter by primary type
  const response = await createApiClient(user.id).userPlaces.markers({
    primaryType: 'restaurant',
  })

  // Then
  assertOk(response)
  expect(response.body.markers).toHaveLength(2)
  const names = (response.body.markers as Marker[]).map((m) => m.name)
  expect(names).toContain('Italian Restaurant')
  expect(names).toContain('French Restaurant')
}

export const filterByRatingRange = async () => {
  // Given - User with places having different ratings
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: 'Low Rated', rating: 2.5 },
    { name: 'Medium Rated', rating: 3.8 },
    { name: 'High Rated', rating: 4.7 },
  ])

  // When - Filter by rating range
  const response = await createApiClient(user.id).userPlaces.markers({
    ratingMin: 3.5,
    ratingMax: 4.5,
  })

  // Then
  assertOk(response)
  expect(response.body.markers).toHaveLength(1)
  expect((response.body.markers as Marker[])[0].name).toBe('Medium Rated')
}

export const filterByWorkforceRange = async () => {
  // Given - User with enriched places having different workforce ranges
  const user = await createUser()
  const places = await seedPlaces(user.id, [
    { name: 'Small Startup' },
    { name: 'Medium Company' },
    { name: 'Large Enterprise' },
  ])

  await seedEnrichment(places[0].placeId, places[0].userPlaceId, {
    workforceRange: '1-10',
  })
  await seedEnrichment(places[1].placeId, places[1].userPlaceId, {
    workforceRange: '51-200',
  })
  await seedEnrichment(places[2].placeId, places[2].userPlaceId, {
    workforceRange: '500+',
  })

  // When - Filter by workforce range
  const response = await createApiClient(user.id).userPlaces.markers({
    workforceRange: '51-200',
  })

  // Then
  assertOk(response)
  expect(response.body.markers).toHaveLength(1)
  expect((response.body.markers as Marker[])[0].name).toBe('Medium Company')
}

export const filterByGlobalSearch = async () => {
  // Given - User with places
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: 'Pizzeria Napoli', website: 'https://sushi.com' },
    { name: 'Tokyo Sushi', website: 'https://tokyo-sushi.com' },
    { name: 'Burger Joint', website: 'https://burgers.com' },
  ])

  // When - Use global search (matches name, address, website)
  const response = await createApiClient(user.id).userPlaces.markers({
    search: 'sushi',
  })

  // Then - Should match by name or website
  assertOk(response)
  expect(response.body.markers).toHaveLength(2)
  const names = (response.body.markers as Marker[]).map((m) => m.name)
  expect(names).toContain('Pizzeria Napoli') // matches website
  expect(names).toContain('Tokyo Sushi') // matches name
}

export const filterCombined = async () => {
  // Given - User with places
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: 'Paris Restaurant A', country: 'France', status: 'NEW' },
    { name: 'Paris Restaurant B', country: 'France', status: 'CONTACTED' },
    { name: 'Berlin Restaurant', country: 'Germany', status: 'NEW' },
    { name: 'Lyon Cafe', country: 'France', status: 'NEW' },
  ])

  // When - Apply multiple filters (country as array for multi-select)
  const response = await createApiClient(user.id).userPlaces.markers({
    country: ['France'],
    status: 'NEW',
  })

  // Then - Should match ALL criteria
  assertOk(response)
  expect(response.body.markers).toHaveLength(2)
  const names = (response.body.markers as Marker[]).map((m) => m.name)
  expect(names).toContain('Paris Restaurant A')
  expect(names).toContain('Lyon Cafe')
}

export const filterByMultipleListIds = async () => {
  // Given - User with places in different lists
  const user = await createUser()

  const list1 = await seedList(user.id, { name: 'Restaurant List' })
  const list2 = await seedList(user.id, { name: 'Bakery List' })
  const list3 = await seedList(user.id, { name: 'Bar List' })

  const [place1, place2, place3] = await seedPlaces(user.id, [
    { name: 'Paris Restaurant' },
    { name: 'Lyon Bakery' },
    { name: 'Bordeaux Bar' },
  ])

  await seedListPlace(list1.id, place1.userPlaceId)
  await seedListPlace(list2.id, place2.userPlaceId)
  await seedListPlace(list3.id, place3.userPlaceId)

  // When - Filter by list1 and list2 (should return 2 markers)
  const response = await createApiClient(user.id).userPlaces.markers({
    listIds: [list1.id, list2.id],
  })

  // Then - Should return only markers from list1 and list2
  assertOk(response)
  expect(response.body.markers).toHaveLength(2)
  const names = (response.body.markers as Marker[]).map((m) => m.name)
  expect(names).toContain('Paris Restaurant')
  expect(names).toContain('Lyon Bakery')
  expect(names).not.toContain('Bordeaux Bar')
}
