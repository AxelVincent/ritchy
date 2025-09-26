import { eq, sql } from 'drizzle-orm'
import { db } from '../../../db/db'
import { credits as creditsTable } from '../../../db/schema'

export const INSUFFICIENT_CREDITS_ERROR = 'insufficient_credits'
export const USER_CREDITS_NOT_FOUND_ERROR = 'user_credits_not_found'

export const consumeCredits = async (userId: string, credits: number) => {
  await db.transaction(async (tx) => {
    // First, get current credits to validate availability
    const [currentCredits] = await tx
      .select({
        credits: creditsTable.credits,
      })
      .from(creditsTable)
      .where(eq(creditsTable.userId, userId))

    if (!currentCredits) {
      throw new Error(USER_CREDITS_NOT_FOUND_ERROR)
    }

    // Check if user has sufficient credits
    if (currentCredits.credits < credits) {
      throw new Error(INSUFFICIENT_CREDITS_ERROR)
    }

    // Atomic update - only proceed if we have enough credits
    await tx
      .update(creditsTable)
      .set({
        credits: sql`credits - ${credits}`,
      })
      .where(eq(creditsTable.userId, userId))
  })

  return credits
}
