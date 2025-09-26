import { logger } from '@ritchy/logger'
import { eq } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { db } from '../../../db/db'
import { credits as creditsTable } from '../../../db/schema'

export const USER_CREDITS_NOT_FOUND_ERROR = 'user_credits_not_found'

export const refundCredits = async (
  userId: string,
  creditsToRefund: number,
) => {
  if (creditsToRefund <= 0) {
    throw new Error('Credits to refund must be greater than 0')
  }

  try {
    await db.transaction(async (tx) => {
      // Lock the row to prevent race conditions
      const [currentCredits] = await tx
        .select({ credits: creditsTable.credits })
        .from(creditsTable)
        .where(eq(creditsTable.userId, userId))
        .for('update') // This locks the row

      if (!currentCredits) {
        throw new Error(USER_CREDITS_NOT_FOUND_ERROR)
      }

      // Update with the locked row
      const [updatedCredits] = await tx
        .update(creditsTable)
        .set({
          credits: sql`credits + ${creditsToRefund}`,
        })
        .where(eq(creditsTable.userId, userId))
        .returning({ credits: creditsTable.credits })

      if (!updatedCredits) {
        throw new Error(USER_CREDITS_NOT_FOUND_ERROR)
      }

      logger.info({
        msg: 'Credits refunded atomically',
        event: 'credits_refunded',
        metadata: {
          userId,
          creditsToRefund,
          newBalance: updatedCredits.credits,
        },
      })

      return updatedCredits
    })

    return true
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === USER_CREDITS_NOT_FOUND_ERROR
    ) {
      logger.info({
        msg: 'User credits not found for refund',
        event: 'refund_credits_user_not_found',
        metadata: { userId, creditsToRefund },
      })
      throw error
    }
    logger.error({
      msg: 'Error refunding credits',
      event: 'refund_credits_error',
      metadata: { userId, creditsToRefund, error },
    })
    throw error
  }
}
