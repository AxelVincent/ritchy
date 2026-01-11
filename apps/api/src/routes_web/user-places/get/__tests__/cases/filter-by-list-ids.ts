import {
  seedList,
  seedListPlace,
} from '../../../../../__tests__/integration/seeders/list-seeder'
import { seedPlaces } from '../../../../../__tests__/integration/seeders/place-seeder'
import { createApiClient } from '../../../../../__tests__/integration/utils/api-client'
import {
  assertAllMatch,
  assertLength,
  assertOk,
} from '../../../../../__tests__/integration/utils/assertions'
import { createUser } from '../../../../../__tests__/integration/utils/user-manager'

export const filterByMultipleListIds = async () => {
  // Given: User with 3 places, each in a different list
  const user = await createUser()

  // Create 3 lists
  const list1 = await seedList(user.id, { name: 'Restaurant List' })
  const list2 = await seedList(user.id, { name: 'Bakery List' })
  const list3 = await seedList(user.id, { name: 'Bar List' })

  // Seed places
  const [place1, place2, place3] = await seedPlaces(user.id, [
    { name: 'Paris Restaurant' },
    { name: 'Lyon Bakery' },
    { name: 'Bordeaux Bar' },
  ])

  // Associate places with lists
  await seedListPlace(list1.id, place1.userPlaceId)
  await seedListPlace(list2.id, place2.userPlaceId)
  await seedListPlace(list3.id, place3.userPlaceId)

  // When: Filter by list1 and list2 (should return 2 places)
  const response = await createApiClient(user.id).userPlaces.get({
    listIds: [list1.id, list2.id],
  })

  // Then: Should return only places from list1 and list2
  assertOk(response)
  assertLength(
    'Only places from list1 and list2 returned',
    response.body.items,
    2,
  )

  const names = response.body.items.map((item: { name: string }) => item.name)
  if (!names.includes('Paris Restaurant') || !names.includes('Lyon Bakery')) {
    throw new Error(
      `Expected 'Paris Restaurant' and 'Lyon Bakery', got: ${names.join(', ')}`,
    )
  }
}

export const filterBySingleListIdArray = async () => {
  // Given: User with places in different lists
  const user = await createUser()

  const list1 = await seedList(user.id, { name: 'Favorites' })
  const list2 = await seedList(user.id, { name: 'To Visit' })

  const [place1, place2] = await seedPlaces(user.id, [
    { name: 'Favorite Place' },
    { name: 'To Visit Place' },
  ])

  await seedListPlace(list1.id, place1.userPlaceId)
  await seedListPlace(list2.id, place2.userPlaceId)

  // When: Filter by single list using listIds array format
  const response = await createApiClient(user.id).userPlaces.get({
    listIds: [list1.id],
  })

  // Then: Should return only places from list1
  assertOk(response)
  assertLength('Only places from list1 returned', response.body.items, 1)
  assertAllMatch(
    'Place is from list1',
    response.body.items,
    (item: { name: string }) => item.name === 'Favorite Place',
  )
}

export const filterByListIdsWithOtherFilters = async () => {
  // Given: User with places in lists, some with specific attributes
  const user = await createUser()

  const list1 = await seedList(user.id, { name: 'French Restaurants' })
  const list2 = await seedList(user.id, { name: 'German Restaurants' })

  const [place1, place2, place3, place4] = await seedPlaces(user.id, [
    { name: 'Paris Café', country: 'France', rating: 4.5 },
    { name: 'Lyon Bistro', country: 'France', rating: 3.0 },
    { name: 'Berlin Eatery', country: 'Germany', rating: 4.8 },
    { name: 'Munich Restaurant', country: 'Germany', rating: 2.5 },
  ])

  // Add all to lists
  await seedListPlace(list1.id, place1.userPlaceId)
  await seedListPlace(list1.id, place2.userPlaceId)
  await seedListPlace(list2.id, place3.userPlaceId)
  await seedListPlace(list2.id, place4.userPlaceId)

  // When: Filter by both lists AND rating >= 4
  const response = await createApiClient(user.id).userPlaces.get({
    listIds: [list1.id, list2.id],
    ratingMin: 4,
  })

  // Then: Should return only high-rated places from both lists
  assertOk(response)
  assertLength('Only high-rated places from both lists', response.body.items, 2)

  const names = response.body.items.map((item: { name: string }) => item.name)
  if (!names.includes('Paris Café') || !names.includes('Berlin Eatery')) {
    throw new Error(
      `Expected 'Paris Café' and 'Berlin Eatery', got: ${names.join(', ')}`,
    )
  }
}

export const filterByEmptyListIds = async () => {
  // Given: User with places
  const user = await createUser()

  const list1 = await seedList(user.id, { name: 'List 1' })
  const [place1] = await seedPlaces(user.id, [{ name: 'Test Place' }])
  await seedListPlace(list1.id, place1.userPlaceId)

  // When: Filter with empty listIds array (should return all places)
  const response = await createApiClient(user.id).userPlaces.get({
    listIds: [],
  })

  // Then: Should return all places (empty filter ignored)
  assertOk(response)
  assertLength(
    'All places returned when listIds is empty',
    response.body.items,
    1,
  )
}

export const filterByNonExistentListId = async () => {
  // Given: User with places
  const user = await createUser()

  const list1 = await seedList(user.id, { name: 'List 1' })
  const [place1] = await seedPlaces(user.id, [{ name: 'Test Place' }])
  await seedListPlace(list1.id, place1.userPlaceId)

  const nonExistentListId = crypto.randomUUID()

  // When: Filter by non-existent list ID
  const response = await createApiClient(user.id).userPlaces.get({
    listIds: [nonExistentListId],
  })

  // Then: Should return empty results
  assertOk(response)
  assertLength(
    'No places returned for non-existent list',
    response.body.items,
    0,
  )
}
