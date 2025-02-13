import type { SubscriptionPlan } from '@ritchy/types'
import { eq } from 'drizzle-orm'
import { db } from '../db/db'
import { subscription } from '../db/schema'

export const getUserPlan = async (
  userId: string,
): Promise<SubscriptionPlan> => {
  const [result] = await db
    .select()
    .from(subscription)
    .where(eq(subscription.userId, userId))
    .limit(1)

  if (!result || result.status !== 'active') {
    return 'FREE'
  }

  return result.plan
}
