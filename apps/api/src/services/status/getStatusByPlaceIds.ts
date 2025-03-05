import type { Status } from '@ritchy/types'
import { and, eq, inArray } from 'drizzle-orm'
import { db } from '../../db/db'
import { status as statusTable } from '../../db/schema'

export const getStatusByPlaceIds = async (
  placeIds: string[],
  userId: string,
): Promise<Map<string, Status>> => {
  if (placeIds.length === 0) {
    return new Map()
  }

  const statuses = await db
    .select()
    .from(statusTable)
    .where(
      and(
        inArray(statusTable.placeId, placeIds),
        eq(statusTable.userId, userId),
      ),
    )

  // Create a map with default 'NEW' status for all placeIds
  const statusMap = new Map<string, Status>()

  // First, set default 'NEW' status for all placeIds
  for (const placeId of placeIds) {
    statusMap.set(placeId, {
      status: 'NEW',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }

  // Then override with actual statuses from database
  for (const dbStatus of statuses) {
    const formattedStatus: Status = {
      status: dbStatus.status,
      createdAt: dbStatus.createdAt.toISOString(),
      updatedAt: dbStatus.updatedAt.toISOString(),
    }

    statusMap.set(dbStatus.placeId, formattedStatus)
  }

  return statusMap
}
