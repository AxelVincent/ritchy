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
    // Check if a lead status already exists for this place and user
    const existingStatus = await db
      .select()
      .from(statusTable)
      .where(
        and(eq(statusTable.placeId, placeId), eq(statusTable.userId, userId)),
      )
      .limit(1)

    if (existingStatus.length > 0) {
      // Update existing lead status
      const [updated] = await db
        .update(statusTable)
        .set({
          status,
          updatedAt: new Date(),
        })
        .where(eq(statusTable.id, existingStatus[0].id))
        .returning()

      return {
        status: updated.status,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      }
    }

    // Create new lead status
    const [created] = await db
      .insert(statusTable)
      .values({
        placeId,
        userId,
        status,
      })
      .returning()

    return {
      status: created.status,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
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
