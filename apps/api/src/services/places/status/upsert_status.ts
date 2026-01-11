import { logger } from '@ritchy/logger'
import { eq } from 'drizzle-orm'
import { db } from '../../../db/db'
import { status as statusTable, userPlace } from '../../../db/schema'
import type { Status, StatusType } from '../../../shared'
import { updateLastInteraction } from '../utils/update_last_interaction'

export const upsertStatus = async (
  userId: string,
  userPlaceId: string,
  status: StatusType,
): Promise<Status> => {
  try {
    logger.info({
      msg: 'Upserting place status',
      event: 'place_status_upsert',
      metadata: {
        userPlaceId,
        status,
      },
    })

    // Validate that the userPlaceId exists and belongs to the user
    const [userPlaceRecord] = await db
      .select()
      .from(userPlace)
      .where(eq(userPlace.id, userPlaceId))
      .limit(1)

    if (!userPlaceRecord) {
      throw new Error(`User place with ID ${userPlaceId} not found`)
    }

    // Verify the user owns this user_place record
    if (userPlaceRecord.user_id !== userId) {
      throw new Error(
        `User place with ID ${userPlaceId} does not belong to user ${userId}`,
      )
    }

    const [result] = await db
      .insert(statusTable)
      .values({
        userPlaceId,
        status,
      })
      .onConflictDoUpdate({
        target: [statusTable.userPlaceId],
        set: {
          status,
          updatedAt: new Date(),
        },
      })
      .returning()

    await updateLastInteraction(userPlaceId)

    return {
      status: result.status,
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
    }
  } catch (error) {
    logger.error({
      msg: 'Failed to upsert place status',
      event: 'place_status_upsert_error',
      metadata: {
        error: error instanceof Error ? error : { error },
        userPlaceId,
        status,
      },
    })
    throw error
  }
}
