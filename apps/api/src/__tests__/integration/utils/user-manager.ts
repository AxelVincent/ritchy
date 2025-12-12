import { user } from '../../../db/schema'
import { getTestDb } from '../setup/test-database'
import { cleanupManager } from './cleanup-manager'

export interface TestUser {
  id: string
  email: string
  clerkId: string
}

export const createUser = async (email?: string): Promise<TestUser> => {
  const db = getTestDb()
  const id = crypto.randomUUID()

  await db.insert(user).values({
    id,
    email: email ?? `test-${id}@test.com`,
    clerkId: `clerk_${id}`,
    firstName: 'Test',
    lastName: 'User',
  })

  cleanupManager.trackUser(id)
  return { id, email: email ?? `test-${id}@test.com`, clerkId: `clerk_${id}` }
}
