import { logger } from '@ritchy/logger'
import type { Status, StatusType } from '@ritchy/types'
import { and, eq } from 'drizzle-orm'
import { db } from '../../db/db'
import { status as statusTable } from '../../db/schema'

export const upsertLeadStatus = async (
  placeId: string,
  userId: string,
  status: StatusType,
): Promise<Status> => {
  try {
    // Replace the separate SELECT + UPDATE/INSERT with a single upsert operation
    const [result] = await db
      .insert(statusTable)
      .values({
        placeId,
        userId,
        status,
      })
      .onConflictDoUpdate({
        target: [statusTable.placeId, statusTable.userId],
        set: {
          status,
          updatedAt: new Date(),
        },
      })
      .returning()

    return {
      status: result.status,
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
    }
  } catch (error) {
    logger.error({
      msg: 'Failed to upsert lead status',
      event: 'lead_status_upsert_error',
      metadata: {
        error: error instanceof Error ? error : { error },
        placeId,
        userId,
        status,
      },
    })
    throw error
  }
}
