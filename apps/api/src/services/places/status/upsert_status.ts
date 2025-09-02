import { logger } from '@ritchy/logger'
import type { Status, StatusType } from '@ritchy/types'
import { eq } from 'drizzle-orm'
import { db } from '../../../db/db'
import { status as statusTable, userPlace } from '../../../db/schema'
import { updateHubspotContactStatus } from '../../hubspot/update_hubspot_contact_status'
import type { HubspotContext } from '../../hubspot/update_place_status'

export const upsertStatus = async (
  context: HubspotContext,
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
        changeSource: context.changeSource,
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
    if (userPlaceRecord.user_id !== context.userId) {
      throw new Error(
        `User place with ID ${userPlaceId} does not belong to user ${context.userId}`,
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

    if (context.changeSource === 'user') {
      updateHubspotContactStatus(context.userId, userPlaceId, status)
    }

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
