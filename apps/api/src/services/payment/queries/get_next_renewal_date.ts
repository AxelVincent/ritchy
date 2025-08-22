import dayjs from 'dayjs'
import { and, eq } from 'drizzle-orm'
import { db } from '../../../db/db'
import { subscription } from '../../../db/schema'

export const getNextRenewalDate = async (userId: string) => {
  const [result] = await db
    .select()
    .from(subscription)
    .where(
      and(eq(subscription.userId, userId), eq(subscription.status, 'active')),
    )
    .limit(1)

  if (!result) {
    return null
  }
  const nextRenewalDate = dayjs(result.updatedAt).add(1, 'month').toISOString()

  return nextRenewalDate
}
