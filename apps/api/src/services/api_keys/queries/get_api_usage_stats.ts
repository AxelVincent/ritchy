import { and, count, eq, gte, sql, sum } from 'drizzle-orm'
import { db } from '../../../db/db'
import { apiKey, apiUsage } from '../../../db/schema'

export type ApiUsageStats = {
  totalRequests: number
  requestsToday: number
  requestsThisMinute: number
  totalCreditsUsed: number
  creditsUsedToday: number
}

export const getApiUsageStats = async (
  userId: string,
): Promise<ApiUsageStats> => {
  const now = new Date()
  const startOfDay = new Date(now)
  startOfDay.setHours(0, 0, 0, 0)

  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000)

  // Get all API key IDs for user
  const userKeys = await db
    .select({ id: apiKey.id })
    .from(apiKey)
    .where(eq(apiKey.userId, userId))

  if (userKeys.length === 0) {
    return {
      totalRequests: 0,
      requestsToday: 0,
      requestsThisMinute: 0,
      totalCreditsUsed: 0,
      creditsUsedToday: 0,
    }
  }

  const keyIds = userKeys.map((k) => k.id)

  // Get total stats
  const [totalStats] = await db
    .select({
      totalRequests: count(),
      totalCreditsUsed: sum(apiUsage.creditsUsed),
    })
    .from(apiUsage)
    .where(sql`${apiUsage.apiKeyId} = ANY(${keyIds})`)

  // Get today's stats
  const [todayStats] = await db
    .select({
      requestsToday: count(),
      creditsUsedToday: sum(apiUsage.creditsUsed),
    })
    .from(apiUsage)
    .where(
      and(
        sql`${apiUsage.apiKeyId} = ANY(${keyIds})`,
        gte(apiUsage.createdAt, startOfDay),
      ),
    )

  // Get this minute's stats
  const [minuteStats] = await db
    .select({
      requestsThisMinute: count(),
    })
    .from(apiUsage)
    .where(
      and(
        sql`${apiUsage.apiKeyId} = ANY(${keyIds})`,
        gte(apiUsage.createdAt, oneMinuteAgo),
      ),
    )

  return {
    totalRequests: Number(totalStats?.totalRequests ?? 0),
    requestsToday: Number(todayStats?.requestsToday ?? 0),
    requestsThisMinute: Number(minuteStats?.requestsThisMinute ?? 0),
    totalCreditsUsed: Number(totalStats?.totalCreditsUsed ?? 0),
    creditsUsedToday: Number(todayStats?.creditsUsedToday ?? 0),
  }
}
