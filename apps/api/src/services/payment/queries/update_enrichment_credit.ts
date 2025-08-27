import { logger } from '@ritchy/logger'
import { eq } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { db } from '../../../db/db'
import { credits as creditsTable } from '../../../db/schema'

export const NO_ENRICHMENT_CREDITS_AVAILABLE_ERROR =
  'no_enrichment_credits_available'

export const USER_CREDITS_NOT_FOUND_ERROR = 'user_credits_not_found'

export const updateEnrichmentCredit = async (
  userId: string,
  refund = false,
) => {
  const creditsToUpdate = refund ? 1 : -1

  try {
    await db.transaction(async (tx) => {
      // Lock the row and check balance
      const [currentCredits] = await tx
        .select({ enrichment: creditsTable.enrichment })
        .from(creditsTable)
        .where(eq(creditsTable.userId, userId))
        .for('update') // This locks the row

      if (!currentCredits) {
        throw new Error(USER_CREDITS_NOT_FOUND_ERROR)
      }

      if (creditsToUpdate < 0 && currentCredits.enrichment === 0) {
        throw new Error(NO_ENRICHMENT_CREDITS_AVAILABLE_ERROR)
      }

      // Update with the locked row
      const [updatedCredits] = await tx
        .update(creditsTable)
        .set({
          enrichment: sql`enrichment + ${creditsToUpdate}`,
        })
        .where(eq(creditsTable.userId, userId))
        .returning({ enrichment: creditsTable.enrichment })

      if (!updatedCredits) {
        throw new Error(USER_CREDITS_NOT_FOUND_ERROR)
      }

      logger.info({
        msg: 'Enrichment credit updated atomically',
        event: 'enrichment_credit_updated',
        metadata: {
          userId,
          creditsToUpdate,
          newBalance: updatedCredits.enrichment,
        },
      })

      return updatedCredits
    })

    return true
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === NO_ENRICHMENT_CREDITS_AVAILABLE_ERROR
    ) {
      logger.info({
        msg: 'No enrichment credits available',
        event: 'consume_enrichment_credit_no_credits',
        metadata: { userId },
      })
      throw error
    }
    logger.error({
      msg: 'Error consuming enrichment credit',
      event: 'consume_enrichment_credit_error',
      metadata: { userId, error },
    })
    throw error
  }
}
