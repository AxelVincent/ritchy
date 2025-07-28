import { logger } from '@ritchy/logger'
import type { Status, StatusType } from '@ritchy/types'
import { createVersionedDb } from '../../../db/versioned_db/client'
import type { VersionContext } from '../../../db/versioned_db/types'
import { updateHubspotContactStatus } from '../../hubspot/update_hubspot_contact_status'

export const upsertStatus = async (
  context: VersionContext,
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
        ...context.metadata,
      },
    })

    const db = createVersionedDb(context)
    const result = await db.upsert(
      'status',
      {
        userPlaceId,
        status,
        updatedAt: new Date(),
      },
      ['userPlaceId'],
    )
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
