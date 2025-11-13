import { logger } from '@ritchy/logger'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '../../../../../db/schema'
import { getEnrichmentCompanyOfficerLinkedin } from '../../../queries/get_enrichment_company_officer_linkedin'
import type {
  ActivityData,
  CompanyContextData,
  PlaceContextData,
} from '../../../queries/get_officers_enrichment_context'
import { insertEnrichmentCompanyOfficerLinkedIn } from '../../../queries/insert_enrichment_company_officer_linkedin'
import type { InsertOfficerLinkedInData } from '../../../queries/insert_enrichment_company_officer_linkedin'
import type { ValidatedOfficerData } from '../../../utils/validate_officer'
import {
  LINKEDIN_PROVIDERS,
  getEnabledProviders,
} from '../../../waterfall_config'
import type { LinkedInWaterfallResult } from './index'
import { enrichWithContactOut } from './providers/enrich_with_contactout'
import { enrichWithIcypeasFindPeople } from './providers/enrich_with_icypeas_find_people'

/**
 * Core LinkedIn enrichment logic
 * This is the shared implementation used by both waterfall variants
 */
export const enrichLinkedInCore = async (
  validated: ValidatedOfficerData,
  company: CompanyContextData & { activities: ActivityData[] },
  place: PlaceContextData,
  tx?: PostgresJsDatabase<typeof schema>,
): Promise<LinkedInWaterfallResult> => {
  const enabledProviders = getEnabledProviders(LINKEDIN_PROVIDERS)
  let linkedinData: InsertOfficerLinkedInData | null = null

  logger.info({
    msg: '[linkedin_waterfall] Starting LinkedIn waterfall enrichment',
    event: 'linkedin_waterfall_start',
    metadata: {
      officerId: validated.id,
      officerName: validated.fullName,
      providersCount: enabledProviders.length,
      providers: enabledProviders.map((p) => p.name),
    },
  })

  for (const providerConfig of enabledProviders) {
    if (linkedinData) {
      logger.debug({
        msg: '[linkedin_waterfall] LinkedIn already found, skipping remaining providers',
        event: 'linkedin_waterfall_skip',
        metadata: {
          officerId: validated.id,
          skippedProvider: providerConfig.name,
        },
      })
      break
    }

    logger.info({
      msg: `[linkedin_waterfall] Trying LinkedIn provider: ${providerConfig.name}`,
      event: 'linkedin_provider_attempt',
      metadata: {
        officerId: validated.id,
        provider: providerConfig.name,
        priority: providerConfig.priority,
      },
    })

    try {
      switch (providerConfig.name) {
        case 'icypeas_find_people': {
          linkedinData = await enrichWithIcypeasFindPeople(
            validated,
            company,
            place,
          )
          break
        }

        case 'contactout_people_search': {
          linkedinData = await enrichWithContactOut(validated)
          break
        }

        default:
          logger.warn({
            msg: `[linkedin_waterfall] Unknown LinkedIn provider: ${providerConfig.name}`,
            event: 'unknown_linkedin_provider',
            metadata: {
              provider: providerConfig.name,
            },
          })
      }
    } catch (providerError) {
      logger.warn({
        msg: `[linkedin_waterfall] LinkedIn provider ${providerConfig.name} failed, trying next`,
        event: 'linkedin_provider_failed',
        metadata: {
          officerId: validated.id,
          provider: providerConfig.name,
          error:
            providerError instanceof Error
              ? providerError.message
              : String(providerError),
        },
      })
      // Continue to next provider in waterfall
    }
  }

  // Insert LinkedIn data after the loop (if found)
  if (linkedinData) {
    await insertEnrichmentCompanyOfficerLinkedIn(linkedinData, tx)
  }

  // Get final result
  const storedLinkedIn = await getEnrichmentCompanyOfficerLinkedin(
    validated.id,
    tx,
  )

  logger.info({
    msg: '[linkedin_waterfall] LinkedIn waterfall enrichment completed',
    event: 'linkedin_waterfall_complete',
    metadata: {
      officerId: validated.id,
      linkedinFound: !!linkedinData,
      providersAttempted: enabledProviders.length,
    },
  })

  if (storedLinkedIn) {
    return {
      success: true,
      profileUrl: storedLinkedIn.profile_url,
      confidence: storedLinkedIn.confidence,
      source: storedLinkedIn.source,
    }
  }

  return {
    success: false,
  }
}
