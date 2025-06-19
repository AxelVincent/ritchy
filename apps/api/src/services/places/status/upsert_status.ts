import { logger } from '@ritchy/logger'
import type { Status, StatusType } from '@ritchy/types'
import { createVersionedDb } from '../../../db/versioned_db/client'
import type { VersionContext } from '../../../db/versioned_db/types'
import { updateHubspotContactStatus } from '../../hubspot/update_hubspot_contact_status'

export const upsertStatus = async (
  context: VersionContext,
  placeId: string,
  status: StatusType,
): Promise<Status> => {
  try {
    logger.info({
      msg: 'Upserting place status',
      event: 'place_status_upsert',
      metadata: {
        placeId,
        userId: context.userId,
        status,
        changeSource: context.changeSource,
        ...context.metadata,
      },
    })

    const db = createVersionedDb(context)
    const result = await db.upsert(
      'status',
      {
        placeId,
        userId: context.userId,
        status,
        updatedAt: new Date(),
      },
      ['placeId', 'userId'],
    )
    if (context.changeSource === 'user') {
      updateHubspotContactStatus(context.userId, placeId, status)
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
        placeId,
        userId: context.userId,
        status,
      },
    })
    throw error
  }
}
