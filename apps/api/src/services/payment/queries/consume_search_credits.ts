import { eq, sql } from 'drizzle-orm'
import { db } from '../../../db/db'
import { credits as creditsTable } from '../../../db/schema'

export const consumeSearchCredits = async (userId: string, credits: number) => {
  let actualCreditsRemoved = 0

  await db.transaction(async (tx) => {
    // Atomic update with validation - no race condition possible
    const [updatedCredits] = await tx
      .update(creditsTable)
      .set({
        search: sql`CASE 
          WHEN search >= ${credits} 
          THEN search - ${credits}
          ELSE search 
        END`,
      })
      .where(eq(creditsTable.userId, userId))
      .returning({
        search: creditsTable.search,
      })

    if (!updatedCredits) {
      throw new Error('User credits not found')
    }

    // Calculate how many credits were actually removed vs. how many couldn't be removed
    actualCreditsRemoved = Math.min(credits, updatedCredits.search + credits)
  })

  return actualCreditsRemoved
}
