import { eq } from 'drizzle-orm'
import { db } from '../../../db/db'
import { subscription } from '../../../db/schema'
import type { Plan } from '../../../shared'

export const getUserPlan = async (userId: string): Promise<Plan> => {
  const [result] = await db
    .select()
    .from(subscription)
    .where(eq(subscription.userId, userId))
    .limit(1)

  if (!result || (result.status !== 'active' && result.status !== 'trialing')) {
    return 'FREE'
  }

  return result.plan
}
