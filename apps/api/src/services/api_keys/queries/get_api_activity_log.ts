import { and, count, desc, eq, inArray } from 'drizzle-orm'
import { db } from '../../../db/db'
import { apiKey, apiUsage } from '../../../db/schema'
import type { PaginationParams } from '../../../shared'
import {
  calculateOffset,
  getSafePaginationParams,
} from '../../../utils/pagination'

export type ApiActivityLogItem = {
  id: string
  endpoint: string
  method: string
  statusCode: number
  creditsUsed: number
  latencyMs: number | null
  createdAt: string
  apiKeyName: string
  requestBody: unknown | null
  responseBody: unknown | null
}

export type GetApiActivityLogResult = {
  items: ApiActivityLogItem[]
  total: number
}

export type GetApiActivityLogOptions = {
  pagination?: Partial<PaginationParams>
  keyId?: string
  statusCode?: number
}

export const getApiActivityLog = async (
  userId: string,
  options: GetApiActivityLogOptions = {},
): Promise<GetApiActivityLogResult> => {
  const { pagination, keyId, statusCode } = options
  const safePagination = getSafePaginationParams(pagination)
  const offset = calculateOffset(safePagination)

  // Get all API key IDs for user (or specific key if provided)
  const userKeys = await db
    .select({ id: apiKey.id })
    .from(apiKey)
    .where(
      keyId
        ? and(eq(apiKey.userId, userId), eq(apiKey.id, keyId))
        : eq(apiKey.userId, userId),
    )

  if (userKeys.length === 0) {
    return { items: [], total: 0 }
  }

  const keyIds = userKeys.map((k) => k.id)

  // Build where conditions
  const whereConditions = [inArray(apiUsage.apiKeyId, keyIds)]
  if (statusCode !== undefined) {
    whereConditions.push(eq(apiUsage.statusCode, statusCode))
  }

  // Get total count
  const [countResult] = await db
    .select({ total: count() })
    .from(apiUsage)
    .where(and(...whereConditions))

  const total = Number(countResult?.total ?? 0)

  if (total === 0) {
    return { items: [], total: 0 }
  }

  // Get paginated items with API key info
  const items = await db
    .select({
      id: apiUsage.id,
      endpoint: apiUsage.endpoint,
      method: apiUsage.method,
      statusCode: apiUsage.statusCode,
      creditsUsed: apiUsage.creditsUsed,
      latencyMs: apiUsage.latencyMs,
      createdAt: apiUsage.createdAt,
      apiKeyName: apiKey.name,
      requestBody: apiUsage.requestBody,
      responseBody: apiUsage.responseBody,
    })
    .from(apiUsage)
    .innerJoin(apiKey, eq(apiUsage.apiKeyId, apiKey.id))
    .where(and(...whereConditions))
    .orderBy(desc(apiUsage.createdAt))
    .limit(safePagination.pageSize)
    .offset(offset)

  return {
    items: items.map((item) => ({
      id: item.id,
      endpoint: item.endpoint,
      method: item.method,
      statusCode: item.statusCode,
      creditsUsed: item.creditsUsed,
      latencyMs: item.latencyMs,
      createdAt: item.createdAt.toISOString(),
      apiKeyName: item.apiKeyName,
      requestBody: item.requestBody,
      responseBody: item.responseBody,
    })),
    total,
  }
}
