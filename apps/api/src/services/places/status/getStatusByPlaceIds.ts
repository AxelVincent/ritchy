import type { Status } from '@ritchy/types'
import { and, eq, inArray } from 'drizzle-orm'
import { db } from '../../../db/db'
import { status as statusTable, userPlace } from '../../../db/schema'

export const getStatusByPlaceIds = async (
  userPlaceIds: string[]
): Promise<Map<string, Status>> => {
  if (userPlaceIds.length === 0) {
    return new Map()
  }

  const statuses = await db
    .select()
    .from(statusTable)
    .innerJoin(userPlace, eq(statusTable.userPlaceId, userPlace.id))
    .where(inArray(userPlace.id, userPlaceIds))

  // Create a map with default 'NEW' status for all placeIds
  const statusMap = new Map<string, Status>()

  // First, set default 'NEW' status for all placeIds
  for (const userPlaceId of userPlaceIds) {
    statusMap.set(userPlaceId, {
      status: 'NEW',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
  }

  // Then override with actual statuses from database
  for (const dbStatus of statuses) {
    const formattedStatus: Status = {
      status: dbStatus.status.status,
      createdAt: dbStatus.status.createdAt.toISOString(),
      updatedAt: dbStatus.status.updatedAt.toISOString()
    }

    statusMap.set(dbStatus.status.userPlaceId, formattedStatus)
  }

  return statusMap
}
