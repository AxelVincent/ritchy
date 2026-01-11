import { expect } from 'vitest'
import {
  seedList,
  seedListPlace,
} from '../../../../../__tests__/integration/seeders/list-seeder'
import { seedPlaces } from '../../../../../__tests__/integration/seeders/place-seeder'
import { createApiClient } from '../../../../../__tests__/integration/utils/api-client'
import { assertOk } from '../../../../../__tests__/integration/utils/assertions'
import { createUser } from '../../../../../__tests__/integration/utils/user-manager'
import { DEFAULT_PLACE_STATUS, NO_LISTS_LABEL } from '../../../../../shared'

export const noPlacesReturnsDefaults = async () => {
  // Given - User with NO places at all
  const user = await createUser()
  // No places seeded

  // When
  const response = await createApiClient(user.id).userPlaces.filterOptions({})

  // Then - Should return empty arrays with defaults (NEW, No lists)
  assertOk(response)
  expect(response.body.status).toEqual([DEFAULT_PLACE_STATUS])
  expect(response.body.lists).toEqual([NO_LISTS_LABEL])
  expect(response.body.primaryType).toEqual([])
  expect(response.body.types).toEqual([])
  expect(response.body.country).toEqual([])
  expect(response.body.locality).toEqual([])
  expect(response.body.postalCode).toEqual([])
  expect(response.body.source).toEqual([])
  expect(response.body.workforceRange).toEqual([])
  expect(response.body.priceLevel).toEqual([])
  expect(response.body.technologies).toEqual([])
}

export const nullValuesFilteredOut = async () => {
  // Given - User with places that have null/empty values for some fields
  const user = await createUser()
  await seedPlaces(user.id, [
    {
      name: 'Complete Place',
      country: 'France',
      locality: 'Paris',
      postalCode: '75001',
    },
    {
      name: 'Incomplete Place',
      // country, locality, postalCode will be undefined/null
    },
  ])

  // When
  const response = await createApiClient(user.id).userPlaces.filterOptions({})

  // Then - Should not include null/undefined values
  assertOk(response)
  // The complete place's values should be there
  expect(response.body.country).toContain('France')
  // The array should not contain null, undefined, or empty strings
  expect(response.body.country).not.toContain(null)
  expect(response.body.country).not.toContain(undefined)
  expect(response.body.country).not.toContain('')
}

export const specialCharactersHandled = async () => {
  // Given - User with places having special characters in names/localities
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: "L'Atelier", locality: 'Saint-Germain-en-Laye' },
    { name: 'Café Müller', locality: 'München' },
    { name: "O'Brien's Pub", locality: 'Düsseldorf' },
  ])

  // When
  const response = await createApiClient(user.id).userPlaces.filterOptions({})

  // Then - Should handle apostrophes and accents correctly
  assertOk(response)
  expect(response.body.locality).toContain('Saint-Germain-en-Laye')
  expect(response.body.locality).toContain('München')
  expect(response.body.locality).toContain('Düsseldorf')
}

export const emptyListScopedReturnsDefaults = async () => {
  // Given - User with an empty list (no places in it)
  const user = await createUser()
  await seedPlaces(user.id, [{ name: 'Standalone Place', country: 'France' }])
  const emptyList = await seedList(user.id, { name: 'Empty List', emoji: '📭' })
  // No places added to the list

  // When - Query filter options scoped to empty list
  const response = await createApiClient(user.id).userPlaces.filterOptions({
    listId: emptyList.id,
  })

  // Then - Should return empty arrays with defaults
  assertOk(response)
  expect(response.body.status).toEqual([DEFAULT_PLACE_STATUS])
  expect(response.body.lists).toEqual([NO_LISTS_LABEL])
  expect(response.body.country).toEqual([])
  expect(response.body.locality).toEqual([])
}

export const optionsSortedAlphabetically = async () => {
  // Given - User with places having values that need sorting
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: 'Place Z', country: 'Spain', locality: 'Zaragoza' },
    { name: 'Place A', country: 'France', locality: 'Avignon' },
    { name: 'Place M', country: 'Germany', locality: 'Munich' },
  ])

  // When
  const response = await createApiClient(user.id).userPlaces.filterOptions({})

  // Then - Options should be sorted alphabetically
  assertOk(response)
  const countries = response.body.country
  const sortedCountries = [...countries].sort()
  expect(countries).toEqual(sortedCountries)

  const localities = response.body.locality
  const sortedLocalities = [...localities].sort()
  expect(localities).toEqual(sortedLocalities)
}

export const listsOptionsSortedWithNoListsFirst = async () => {
  // Given - User with places in multiple lists
  const user = await createUser()
  const places = await seedPlaces(user.id, [
    { name: 'Place 1' },
    { name: 'Place 2' },
    { name: 'Place 3' }, // Will not be in any list
  ])

  const listZ = await seedList(user.id, { name: 'Zebra List', emoji: '🦓' })
  const listA = await seedList(user.id, { name: 'Alpha List', emoji: '🅰️' })

  await seedListPlace(listZ.id, places[0].userPlaceId)
  await seedListPlace(listA.id, places[1].userPlaceId)

  // When
  const response = await createApiClient(user.id).userPlaces.filterOptions({})

  // Then - 'No lists' should be first, then sorted alphabetically
  assertOk(response)
  expect(response.body.lists[0]).toBe(NO_LISTS_LABEL)
  // After 'No lists', check that the rest are sorted
  const listsWithoutNoLists = response.body.lists.slice(1)
  const sortedLists = [...listsWithoutNoLists].sort()
  expect(listsWithoutNoLists).toEqual(sortedLists)
}
