import { logger } from '@ritchy/logger'
import type { Status, StatusType } from '@ritchy/types'
import type { Request } from 'express'
import { createVersionedDb } from '../../../db/client'

export const upsertPlaceStatus = async (
  req: Request,
  placeId: string,
  status: StatusType,
): Promise<Status> => {
  try {
    const db = createVersionedDb(req)
    const result = await db.upsert(
      'status',
      {
        placeId,
        userId: req.auth.userId,
        status,
        updatedAt: new Date(),
      },
      ['placeId', 'userId'],
    )

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
        userId: req.auth.userId,
        status,
      },
    })
    throw error
  }
}
