import { and, eq, gt, sql } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../../db/db'
import type * as schema from '../../../../db/schema'
import { foragerPhoneCache } from '../../../../db/schema/enrichment'

const STALENESS_DAYS = 30

/**
 * Get cached Forager phone lookup result
 * Returns null if not found or if the cache is stale (older than 30 days)
 * @param linkedinPublicIdentifier LinkedIn public identifier (e.g., "john-doe-123456")
 * @param tx Optional database transaction
 * @returns Cached phone data or null
 */
export const getForagerPhoneCache = async (
  linkedinPublicIdentifier: string,
  tx?: PostgresJsDatabase<typeof schema>,
) => {
  const database = tx || db

  const stalenessThreshold = new Date()
  stalenessThreshold.setDate(stalenessThreshold.getDate() - STALENESS_DAYS)

  const result = await database
    .select()
    .from(foragerPhoneCache)
    .where(
      and(
        eq(
          foragerPhoneCache.linkedin_public_identifier,
          linkedinPublicIdentifier,
        ),
        gt(foragerPhoneCache.updatedAt, stalenessThreshold),
      ),
    )
    .limit(1)

  return result[0] || null
}
