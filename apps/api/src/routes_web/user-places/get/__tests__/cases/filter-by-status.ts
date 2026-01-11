import { seedPlaces } from '../../../../../__tests__/integration/seeders/place-seeder'
import { createApiClient } from '../../../../../__tests__/integration/utils/api-client'
import {
  assertAllMatch,
  assertLength,
  assertOk,
} from '../../../../../__tests__/integration/utils/assertions'
import { createUser } from '../../../../../__tests__/integration/utils/user-manager'

export const filterByStatus = async () => {
  // Given
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: 'New Lead', country: 'France', status: 'NEW' },
    { name: 'Contacted Lead', country: 'France', status: 'CONTACTED' },
    { name: 'Qualified Lead', country: 'France', status: 'INTERESTED' },
  ])

  // When
  const response = await createApiClient(user.id).userPlaces.get({
    status: 'NEW',
  })

  // Then
  assertOk(response)
  assertLength('Only NEW status places', response.body.items, 1)
  assertAllMatch(
    'All places have NEW status',
    response.body.items,
    (item: { status: string }) => item.status === 'NEW',
  )
}

export const filterByMultipleStatuses = async () => {
  // Given
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: 'New Lead', country: 'France', status: 'NEW' },
    { name: 'Contacted Lead', country: 'France', status: 'CONTACTED' },
    { name: 'Lost Lead', country: 'France', status: 'LOST' },
  ])

  // When
  const response = await createApiClient(user.id).userPlaces.get({
    status: ['NEW', 'CONTACTED'],
  })

  // Then
  assertOk(response)
  assertLength('NEW and CONTACTED status places', response.body.items, 2)
}

export const filterByDefaultStatus = async () => {
  // Given - Places without explicit status default to NEW
  const user = await createUser()
  await seedPlaces(user.id, [
    { name: 'Place Without Status', country: 'France' },
    { name: 'Contacted Place', country: 'France', status: 'CONTACTED' },
  ])

  // When
  const response = await createApiClient(user.id).userPlaces.get({
    status: 'NEW',
  })

  // Then
  assertOk(response)
  assertLength('Place without status defaults to NEW', response.body.items, 1)
}
