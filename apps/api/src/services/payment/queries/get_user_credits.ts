import { eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../db/db'
import type * as schema from '../../../db/schema'
import { credits } from '../../../db/schema/credits'

export const getUserCredits = async (
  userId: string,
  tx?: PostgresJsDatabase<typeof schema>,
) => {
  const dbOrTx = tx ?? db
  const [result] = await dbOrTx
    .select({
      credits: credits.credits,
    })
    .from(credits)
    .where(eq(credits.userId, userId))
    .limit(1)

  if (!result) {
    return 0
  }

  return result.credits
}
