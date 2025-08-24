import { logger } from '@ritchy/logger'
import type { Status, StatusType } from '@ritchy/types'
import { db } from '../../../db/db'
import { status as statusTable } from '../../../db/schema'
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

    const [result] = await db
      .insert(statusTable)
      .values({
        userPlaceId,
        status,
      })
      .onConflictDoUpdate({
        target: [statusTable.userPlaceId, statusTable.status],
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
