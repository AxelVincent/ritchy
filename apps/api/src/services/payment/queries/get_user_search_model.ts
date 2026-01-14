import { eq } from 'drizzle-orm'
import { db } from '../../../db/db'
import { subscription } from '../../../db/schema'
import type { SearchModel } from '../../../shared'

export const getUserSearchModel = async (
  userId: string,
): Promise<SearchModel> => {
  const [result] = await db
    .select()
    .from(subscription)
    .where(eq(subscription.userId, userId))
    .limit(1)

  if (!result || (result.status !== 'active' && result.status !== 'trialing')) {
    return 'BASIC' // Free users get BASIC model
  }

  return result.searchModel
}
