import { logger } from '@ritchy/logger'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../../db/db'
import type * as schema from '../../../../db/schema'
import { foragerPhoneCache } from '../../../../db/schema/enrichment'

export interface UpsertForagerPhoneCacheData {
  readonly linkedin_public_identifier: string
  readonly phone_numbers: readonly string[]
}

/**
 * Upsert Forager phone cache
 * Updates the cache if it exists, inserts if it doesn't
 * @param cacheData Cache data to upsert
 * @param tx Optional database transaction
 * @returns Upserted cache record
 */
export const upsertForagerPhoneCache = async (
  cacheData: UpsertForagerPhoneCacheData,
  tx?: PostgresJsDatabase<typeof schema>,
) => {
  const database = tx || db

  try {
    const upsertedCache = await database
      .insert(foragerPhoneCache)
      .values({
        linkedin_public_identifier: cacheData.linkedin_public_identifier,
        phone_numbers: cacheData.phone_numbers,
      })
      .onConflictDoUpdate({
        target: foragerPhoneCache.linkedin_public_identifier,
        set: {
          phone_numbers: cacheData.phone_numbers,
          updatedAt: new Date(),
        },
      })
      .returning()

    logger.info({
      msg: '[upsert_forager_phone_cache] Forager phone cache upserted successfully',
      event: 'upsert_forager_phone_cache_success',
      metadata: {
        linkedinPublicIdentifier: cacheData.linkedin_public_identifier,
        phoneCount: cacheData.phone_numbers.length,
      },
    })

    return upsertedCache[0]
  } catch (error) {
    logger.error({
      msg: '[upsert_forager_phone_cache] Failed to upsert Forager phone cache',
      event: 'upsert_forager_phone_cache_error',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        linkedinPublicIdentifier: cacheData.linkedin_public_identifier,
      },
    })
    throw error
  }
}
