import type { PlaceListAssociation } from '@ritchy/types'
import { and, eq, inArray } from 'drizzle-orm'
import { db } from '../../db/db'
import { listPlace } from '../../db/schema'
import { list } from '../../db/schema'
export const getListAssociationsByPlaceIds = async (
  googlePlaceIds: string[],
  userId: string,
  listId?: number,
): Promise<Map<string, PlaceListAssociation[]>> => {
  const placeIdSet = new Set(googlePlaceIds)

  const associations = await db
    .select({
      placeId: listPlace.placeId,
      listId: list.id,
      listName: list.name,
      listEmoji: list.emoji,
      createdAt: listPlace.createdAt,
    })
    .from(list)
    .leftJoin(listPlace, eq(list.id, listPlace.listId))
    .where(
      and(inArray(listPlace.placeId, [...placeIdSet]), eq(list.userId, userId)),
    )

  // Initialize the Map with empty arrays for all placeIds
  const resultMap = new Map<string, PlaceListAssociation[]>(
    [...placeIdSet].map((placeId) => [placeId, []]),
  )

  // Add associations where they exist
  for (const association of associations) {
    if (!association.placeId) continue

    const currentAssociations = resultMap.get(association.placeId) ?? []
    const newAssociation = {
      id: association.listId.toString(),
      name: association.listName,
      emoji: association.listEmoji,
    }

    currentAssociations.push(newAssociation)
    resultMap.set(association.placeId, currentAssociations)
  }

  // If listId is provided, sort the arrays to ensure it appears first
  if (listId) {
    for (const [placeId, associations] of resultMap) {
      const sorted = associations.sort((a, b) =>
        a.id === listId.toString() ? -1 : b.id === listId.toString() ? 1 : 0,
      )
      resultMap.set(placeId, sorted)
    }
  }

  return resultMap
}
