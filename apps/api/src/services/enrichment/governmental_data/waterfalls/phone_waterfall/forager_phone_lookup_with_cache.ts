import { logger } from '@ritchy/logger'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '../../../../../db/schema'
import { enqueueForagerPhoneLookupJob } from '../../../../../internal/bullmq/jobs/forager/phone_lookup/queue'
import { getForagerPhoneCache } from '../../../../../services/enrichment/queries/get_forager_phone_cache'
import { upsertForagerPhoneCache } from '../../../../../services/enrichment/queries/upsert_forager_phone_cache'

export interface ForagerPhoneLookupParams {
  readonly linkedinPublicIdentifier: string
}

export interface ForagerPhoneLookupResult {
  readonly phoneNumbers: readonly string[]
  readonly fromCache: boolean
}

/**
 * Lookup phone numbers for a person using Forager API with caching
 * Checks cache first (30-day staleness), then calls API if needed
 * @param params Lookup parameters
 * @param tx Optional database transaction
 * @returns Phone numbers and cache status
 */
export const foragerPhoneLookupWithCache = async (
  params: ForagerPhoneLookupParams,
  tx?: PostgresJsDatabase<typeof schema>,
): Promise<ForagerPhoneLookupResult> => {
  const { linkedinPublicIdentifier } = params

  logger.info({
    msg: '[forager_phone_lookup_with_cache] Starting Forager phone lookup',
    event: 'forager_phone_lookup_start',
    metadata: {
      linkedinPublicIdentifier,
    },
  })

  // Check cache first
  const cachedData = await getForagerPhoneCache(linkedinPublicIdentifier, tx)

  if (cachedData) {
    logger.info({
      msg: '[forager_phone_lookup_with_cache] Found cached Forager phone data',
      event: 'forager_phone_lookup_cache_hit',
      metadata: {
        linkedinPublicIdentifier,
        phoneCount: cachedData.phone_numbers.length,
        cacheAge: Date.now() - cachedData.updatedAt.getTime(),
      },
    })

    return {
      phoneNumbers: cachedData.phone_numbers,
      fromCache: true,
    }
  }

  logger.info({
    msg: '[forager_phone_lookup_with_cache] Cache miss, calling Forager API',
    event: 'forager_phone_lookup_cache_miss',
    metadata: {
      linkedinPublicIdentifier,
    },
  })

  // Call Forager API
  try {
    const foragerResult = await enqueueForagerPhoneLookupJob({
      linkedinPublicIdentifier,
    })

    const phoneNumbers = foragerResult.map((result) => result.phone_number)

    // Cache the result (even if empty, to avoid repeated API calls)
    await upsertForagerPhoneCache(
      {
        linkedin_public_identifier: linkedinPublicIdentifier,
        phone_numbers: phoneNumbers,
      },
      tx,
    )

    logger.info({
      msg: '[forager_phone_lookup_with_cache] Forager phone lookup completed',
      event: 'forager_phone_lookup_api_success',
      metadata: {
        linkedinPublicIdentifier,
        phoneCount: phoneNumbers.length,
      },
    })

    return {
      phoneNumbers,
      fromCache: false,
    }
  } catch (error) {
    logger.error({
      msg: '[forager_phone_lookup_with_cache] Forager phone lookup failed',
      event: 'forager_phone_lookup_api_error',
      metadata: {
        linkedinPublicIdentifier,
        error: error instanceof Error ? error.message : String(error),
      },
    })
    throw error
  }
}
