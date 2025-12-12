import { list, listPlace } from '../../../db/schema'
import { getTestDb } from '../setup/test-database'
import { cleanupManager } from '../utils/cleanup-manager'

export interface ListData {
  name: string
  emoji?: string
}

export const seedList = async (userId: string, data: ListData) => {
  const db = getTestDb()
  const listId = crypto.randomUUID()

  await db.insert(list).values({
    id: listId,
    name: data.name,
    emoji: data.emoji ?? '=�',
    userId: userId,
  })

  cleanupManager.trackList(listId)

  return { id: listId, name: data.name, emoji: data.emoji ?? '=�' }
}

export const seedListPlace = async (listId: string, userPlaceId: string) => {
  const db = getTestDb()
  const listPlaceId = crypto.randomUUID()

  await db.insert(listPlace).values({
    id: listPlaceId,
    listId: listId,
    userPlaceId: userPlaceId,
  })

  // list_place is cleaned up via cascade when list is deleted

  return { id: listPlaceId }
}
