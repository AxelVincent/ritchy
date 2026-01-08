import { logger } from '@ritchy/logger'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '../../../../../../db/schema'
import { extractLinkedInIdentifier } from '../../../../shared/utils/extract_linkedin_identifier'
import { getEnrichmentCompanyOfficerLinkedin } from '../../../queries/get_enrichment_company_officer_linkedin'
import type { InsertOfficerPhoneData } from '../../../queries/insert_enrichment_company_officer_phones'
import { foragerPhoneLookupWithCache } from '../forager_phone_lookup_with_cache'

export const enrichWithForagerPhone = async (
  officerId: string,
  tx?: PostgresJsDatabase<typeof schema>,
): Promise<InsertOfficerPhoneData[]> => {
  // Get LinkedIn profile for this officer
  const linkedinProfile = await getEnrichmentCompanyOfficerLinkedin(
    officerId,
    tx,
  )

  if (!linkedinProfile) {
    logger.info({
      msg: '[phone_waterfall] No LinkedIn profile found for officer, skipping Forager',
      event: 'forager_no_linkedin_profile',
      metadata: {
        officerId,
      },
    })
    return []
  }

  // Extract LinkedIn public identifier from profile URL using robust extraction
  const extractionResult = extractLinkedInIdentifier(
    linkedinProfile.profile_url,
  )

  if (!extractionResult.success) {
    logger.warn({
      msg: '[phone_waterfall] Failed to extract LinkedIn public identifier',
      event: 'forager_invalid_linkedin_url',
      metadata: {
        officerId,
        profileUrl: linkedinProfile.profile_url,
        errorType: extractionResult.error.type,
        errorMessage: extractionResult.error.message,
      },
    })
    return []
  }

  const linkedinPublicIdentifier = extractionResult.identifier

  // Use a placeholder person ID (Forager requires this but we don't have it)
  // In a real scenario, you might want to store person_id with the LinkedIn profile

  try {
    const foragerResult = await foragerPhoneLookupWithCache(
      {
        linkedinPublicIdentifier,
      },
      tx,
    )

    if (foragerResult.phoneNumbers.length > 0) {
      logger.info({
        msg: '[phone_waterfall] Phones found via Forager',
        event: 'phones_found_forager',
        metadata: {
          officerId,
          phoneCount: foragerResult.phoneNumbers.length,
          fromCache: foragerResult.fromCache,
        },
      })

      return foragerResult.phoneNumbers.map((phone) => ({
        officer_id: officerId,
        phone,
        source: 'forager',
      }))
    }

    logger.info({
      msg: '[phone_waterfall] No phones found via Forager, trying next provider',
      event: 'forager_no_phones',
      metadata: {
        officerId,
        fromCache: foragerResult.fromCache,
      },
    })
  } catch (error) {
    logger.warn({
      msg: '[phone_waterfall] Forager phone lookup failed',
      event: 'forager_phone_lookup_failed',
      metadata: {
        officerId,
        error: error instanceof Error ? error.message : String(error),
      },
    })
  }

  return []
}
