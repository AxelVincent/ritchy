import { seedEnrichment } from '../../../../../__tests__/integration/seeders/enrichment-seeder'
import { seedPlaces } from '../../../../../__tests__/integration/seeders/place-seeder'
import { createApiClient } from '../../../../../__tests__/integration/utils/api-client'
import {
  assertAllMatch,
  assertLength,
  assertOk,
} from '../../../../../__tests__/integration/utils/assertions'
import { createUser } from '../../../../../__tests__/integration/utils/user-manager'

export const filterByLocality = async () => {
  // Given
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: 'Paris Place', country: 'France', locality: 'Paris' },
    { name: 'Lyon Place', country: 'France', locality: 'Lyon' },
    { name: 'Paris Cafe', country: 'France', locality: 'Paris' },
  ])

  // When
  const response = await createApiClient(user.id).userPlaces.get({
    locality: 'Paris',
  })

  // Then
  assertOk(response)
  assertLength('Only Paris places returned', response.body.items, 2)
  assertAllMatch(
    'All places are in Paris',
    response.body.items,
    (item: { address: { locality: string } }) =>
      item.address.locality === 'Paris',
  )
}

export const filterByMultipleLocalities = async () => {
  // Given
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: 'Paris Place', country: 'France', locality: 'Paris' },
    { name: 'Lyon Place', country: 'France', locality: 'Lyon' },
    { name: 'Marseille Place', country: 'France', locality: 'Marseille' },
  ])

  // When
  const response = await createApiClient(user.id).userPlaces.get({
    locality: ['Paris', 'Lyon'],
  })

  // Then
  assertOk(response)
  assertLength('Paris and Lyon places returned', response.body.items, 2)
}

export const filterByPostalCode = async () => {
  // Given
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: 'Place 75001', country: 'France', postalCode: '75001' },
    { name: 'Place 75002', country: 'France', postalCode: '75002' },
    { name: 'Place 69001', country: 'France', postalCode: '69001' },
  ])

  // When - Partial match
  const response = await createApiClient(user.id).userPlaces.get({
    postalCode: '750',
  })

  // Then
  assertOk(response)
  assertLength('Only places starting with 750', response.body.items, 2)
}

export const filterByStreet = async () => {
  // Given
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: 'Place on Main', country: 'France', street: 'Main Street' },
    { name: 'Place on Oak', country: 'France', street: 'Oak Avenue' },
    { name: 'Another Main', country: 'France', street: 'Main Boulevard' },
  ])

  // When - Partial match
  const response = await createApiClient(user.id).userPlaces.get({
    street: 'Main',
  })

  // Then
  assertOk(response)
  assertLength('Only places on Main streets', response.body.items, 2)
}

export const filterByWebsite = async () => {
  // Given
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: 'Example Site', country: 'France', website: 'https://example.com' },
    { name: 'Test Site', country: 'France', website: 'https://test.org' },
    {
      name: 'Example Shop',
      country: 'France',
      website: 'https://shop.example.com',
    },
  ])

  // When - Partial match
  const response = await createApiClient(user.id).userPlaces.get({
    website: 'example',
  })

  // Then
  assertOk(response)
  assertLength('Only places with example in website', response.body.items, 2)
}

export const filterByPhone = async () => {
  // Given
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: 'Paris Place', country: 'France', phone: '+33 1 23 45 67 89' },
    { name: 'Lyon Place', country: 'France', phone: '+33 4 56 78 90 12' },
    { name: 'Another Paris', country: 'France', phone: '+33 1 98 76 54 32' },
  ])

  // When - Partial match on area code
  const response = await createApiClient(user.id).userPlaces.get({
    phone: '+33 1',
  })

  // Then
  assertOk(response)
  assertLength('Only places with +33 1 phone prefix', response.body.items, 2)
}

export const filterByPrimaryType = async () => {
  // Given
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: 'Restaurant A', country: 'France', primaryType: 'restaurant' },
    { name: 'Cafe B', country: 'France', primaryType: 'cafe' },
    { name: 'Restaurant C', country: 'France', primaryType: 'restaurant' },
  ])

  // When
  const response = await createApiClient(user.id).userPlaces.get({
    primaryType: 'restaurant',
  })

  // Then
  assertOk(response)
  assertLength('Only restaurants returned', response.body.items, 2)
  assertAllMatch(
    'All places are restaurants',
    response.body.items,
    (item: { primaryType: string }) => item.primaryType === 'restaurant',
  )
}

export const filterByMultiplePrimaryTypes = async () => {
  // Given
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: 'Restaurant', country: 'France', primaryType: 'restaurant' },
    { name: 'Cafe', country: 'France', primaryType: 'cafe' },
    { name: 'Bar', country: 'France', primaryType: 'bar' },
  ])

  // When
  const response = await createApiClient(user.id).userPlaces.get({
    primaryType: ['restaurant', 'cafe'],
  })

  // Then
  assertOk(response)
  assertLength('Restaurants and cafes returned', response.body.items, 2)
}

export const filterByTypes = async () => {
  // Given
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: 'Place A', country: 'France', types: ['restaurant', 'bar'] },
    { name: 'Place B', country: 'France', types: ['cafe', 'bakery'] },
    { name: 'Place C', country: 'France', types: ['restaurant', 'cafe'] },
  ])

  // When - Filter by type in array
  const response = await createApiClient(user.id).userPlaces.get({
    types: ['bar'],
  })

  // Then
  assertOk(response)
  assertLength('Only places with bar in types', response.body.items, 1)
}

export const filterByPriceLevel = async () => {
  // Given
  const user = await createUser()
  await seedPlaces(user.id, [
    {
      name: 'Cheap Place',
      country: 'France',
      priceLevel: 'PRICE_LEVEL_INEXPENSIVE',
    },
    {
      name: 'Mid Place',
      country: 'France',
      priceLevel: 'PRICE_LEVEL_MODERATE',
    },
    {
      name: 'Expensive',
      country: 'France',
      priceLevel: 'PRICE_LEVEL_EXPENSIVE',
    },
  ])

  // When
  const response = await createApiClient(user.id).userPlaces.get({
    priceLevel: 'PRICE_LEVEL_MODERATE',
  })

  // Then
  assertOk(response)
  assertLength('Only moderate price places', response.body.items, 1)
}

export const filterByGlobalSearch = async () => {
  // Given
  const user = await createUser()
  await seedPlaces(user.id, [
    {
      name: 'Acme Restaurant',
      country: 'France',
      formattedAddress: '123 Main St',
    },
    { name: 'Test Cafe', country: 'France', formattedAddress: 'Acme Building' },
    { name: 'Random Place', country: 'France', website: 'https://acme.com' },
    { name: 'Other Place', country: 'France' },
  ])

  // When - Global search across name, address, website
  const response = await createApiClient(user.id).userPlaces.get({
    search: 'acme',
  })

  // Then
  assertOk(response)
  assertLength(
    'Places with acme in name, address, or website',
    response.body.items,
    3,
  )
}

export const filterByWorkforceRange = async () => {
  // Given
  const user = await createUser()
  const places = await seedPlaces(user.id, [
    { name: 'Small Company', country: 'France' },
    { name: 'Medium Company', country: 'France' },
    { name: 'Large Company', country: 'France' },
  ])

  await seedEnrichment(places[0].placeId, places[0].userPlaceId, {
    workforceRange: '1-10',
  })
  await seedEnrichment(places[1].placeId, places[1].userPlaceId, {
    workforceRange: '11-50',
  })
  await seedEnrichment(places[2].placeId, places[2].userPlaceId, {
    workforceRange: '51-200',
  })

  // When
  const response = await createApiClient(user.id).userPlaces.get({
    workforceRange: ['1-10', '11-50'],
  })

  // Then
  assertOk(response)
  assertLength('Small and medium companies', response.body.items, 2)
}

export const filterByDateOfCreation = async () => {
  // Given
  const user = await createUser()
  const places = await seedPlaces(user.id, [
    { name: 'Old Company', country: 'France' },
    { name: 'New Company', country: 'France' },
    { name: 'Recent Company', country: 'France' },
  ])

  await seedEnrichment(places[0].placeId, places[0].userPlaceId, {
    dateOfCreation: '2010-01-01',
  })
  await seedEnrichment(places[1].placeId, places[1].userPlaceId, {
    dateOfCreation: '2020-01-01',
  })
  await seedEnrichment(places[2].placeId, places[2].userPlaceId, {
    dateOfCreation: '2023-06-15',
  })

  // When - Companies created after 2019
  const response = await createApiClient(user.id).userPlaces.get({
    dateOfCreationFrom: '2019-01-01',
  })

  // Then
  assertOk(response)
  assertLength('Companies created after 2019', response.body.items, 2)
}

export const filterByDateOfCreationRange = async () => {
  // Given
  const user = await createUser()
  const places = await seedPlaces(user.id, [
    { name: 'Very Old', country: 'France' },
    { name: 'In Range', country: 'France' },
    { name: 'Too New', country: 'France' },
  ])

  await seedEnrichment(places[0].placeId, places[0].userPlaceId, {
    dateOfCreation: '2010-01-01',
  })
  await seedEnrichment(places[1].placeId, places[1].userPlaceId, {
    dateOfCreation: '2018-06-15',
  })
  await seedEnrichment(places[2].placeId, places[2].userPlaceId, {
    dateOfCreation: '2023-01-01',
  })

  // When - Companies created between 2015 and 2020
  const response = await createApiClient(user.id).userPlaces.get({
    dateOfCreationFrom: '2015-01-01',
    dateOfCreationTo: '2020-12-31',
  })

  // Then
  assertOk(response)
  assertLength('Companies in date range', response.body.items, 1)
}
