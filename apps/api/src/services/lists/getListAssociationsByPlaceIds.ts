import { logger } from '@ritchy/logger'
import type { PlaceListAssociation } from '@ritchy/types'
import { and, eq, inArray } from 'drizzle-orm'
import { db } from '../../db/db'
import { listPlace, place, userPlace } from '../../db/schema'
import { list } from '../../db/schema'

export const getListAssociationsByPlaceIds = async (
  userPlaceIds: string[],
  userId: string,
  listId?: string,
): Promise<Map<string, PlaceListAssociation[]>> => {
  const userPlaceIdSet = new Set(userPlaceIds)

  logger.debug({
    msg: 'Getting list associations by place ids',
    event: 'get_list_associations_by_place_ids',
    metadata: {
      userPlaceIds,
      userId,
      listId,
    },
  })

  const associations = await db
    .select({
      userPlaceId: userPlace.id,
      listId: list.id,
      listName: list.name,
      listEmoji: list.emoji,
      createdAt: listPlace.createdAt,
    })
    .from(list)
    .leftJoin(listPlace, eq(list.id, listPlace.listId))
    .innerJoin(userPlace, eq(listPlace.userPlaceId, userPlace.id))
    .innerJoin(place, eq(userPlace.placeId, place.id))
    .where(
      and(
        inArray(userPlace.id, [...userPlaceIdSet]),
        eq(userPlace.userId, userId),
      ),
    )

  // Initialize the Map with empty arrays for all placeIds
  const resultMap = new Map<string, PlaceListAssociation[]>(
    [...userPlaceIdSet].map((userPlaceId) => [userPlaceId, []]),
  )

  logger.debug({
    msg: 'List associations by place ids',
    event: 'list_associations_by_place_ids',
    metadata: {
      associations,
      resultMap,
    },
  })

  // Add associations where they exist
  for (const association of associations) {
    if (!association.userPlaceId) continue

    const currentAssociations = resultMap.get(association.userPlaceId) ?? []
    const newAssociation = {
      id: association.listId.toString(),
      name: association.listName,
      emoji: association.listEmoji,
    }

    currentAssociations.push(newAssociation)
    resultMap.set(association.userPlaceId, currentAssociations)
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
