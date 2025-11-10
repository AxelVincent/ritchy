import { logger } from '@ritchy/logger'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '../../../../../db/schema'
import { getEnrichmentOfficerFullContext } from '../../../queries/get_enrichment_officer_full_context'
import {
  type InsertOfficerPhoneData,
  insertEnrichmentCompanyOfficerPhones,
} from '../../../queries/insert_enrichment_company_officer_phones'
import { PHONE_PROVIDERS, getEnabledProviders } from '../../../waterfall_config'
import type { PhoneWaterfallContext, PhoneWaterfallResult } from './index'
import { enrichWithContactOutPhone } from './providers/enrich_with_contactout_phone'
import { enrichWithForagerPhone } from './providers/enrich_with_forager_phone'

export const runPhoneWaterfall = async (
  context: PhoneWaterfallContext,
  tx?: PostgresJsDatabase<typeof schema>,
): Promise<PhoneWaterfallResult> => {
  // Get officer data
  const officer = await getEnrichmentOfficerFullContext(context.officerId, tx)

  if (!officer) {
    logger.warn({
      msg: '[phone_waterfall] Officer not found',
      event: 'phone_waterfall_officer_not_found',
      metadata: {
        officerId: context.officerId,
      },
    })
    return {
      success: false,
      phonesFound: 0,
      phones: [],
      providersUsed: [],
    }
  }

  // Skip legal entities (only enrich physical persons)
  if (officer.type === 'legal') {
    logger.debug({
      msg: '[phone_waterfall] Skipping phone enrichment for legal entity',
      event: 'phone_waterfall_skipped_legal',
      metadata: {
        officerId: context.officerId,
      },
    })
    return {
      success: false,
      phonesFound: 0,
      phones: [],
      providersUsed: [],
    }
  }

  // Skip enrichment if no name
  if (!officer.first_name && !officer.last_name) {
    logger.debug({
      msg: '[phone_waterfall] Skipping phone enrichment for officer without name',
      event: 'phone_waterfall_skipped_no_name',
      metadata: {
        officerId: context.officerId,
      },
    })
    return {
      success: false,
      phonesFound: 0,
      phones: [],
      providersUsed: [],
    }
  }

  const firstName = officer.first_name?.split(',')[0]?.trim() ?? ''
  const lastName = officer.last_name ?? ''

  if (!firstName || !lastName) {
    logger.debug({
      msg: '[phone_waterfall] Skipping phone enrichment due to missing first or last name',
      event: 'phone_waterfall_skipped_incomplete_name',
      metadata: {
        officerId: context.officerId,
        hasFirstName: !!firstName,
        hasLastName: !!lastName,
      },
    })
    return {
      success: false,
      phonesFound: 0,
      phones: [],
      providersUsed: [],
    }
  }

  const enabledProviders = getEnabledProviders(PHONE_PROVIDERS)
  let phonesFound = false
  const allPhonesData: InsertOfficerPhoneData[] = []

  logger.info({
    msg: '[phone_waterfall] Starting phone waterfall enrichment',
    event: 'phone_waterfall_start',
    metadata: {
      officerId: context.officerId,
      officerName: `${firstName} ${lastName}`,
      providersCount: enabledProviders.length,
      providers: enabledProviders.map((p) => p.name),
    },
  })

  for (const providerConfig of enabledProviders) {
    if (phonesFound) {
      logger.debug({
        msg: '[phone_waterfall] Phones already found, skipping remaining providers',
        event: 'phone_waterfall_skip',
        metadata: {
          officerId: context.officerId,
          skippedProvider: providerConfig.name,
        },
      })
      break
    }

    logger.info({
      msg: `[phone_waterfall] Trying phone provider: ${providerConfig.name}`,
      event: 'phone_provider_attempt',
      metadata: {
        officerId: context.officerId,
        provider: providerConfig.name,
        priority: providerConfig.priority,
      },
    })

    try {
      let providerPhones: InsertOfficerPhoneData[] = []

      switch (providerConfig.name) {
        case 'forager_phone': {
          providerPhones = await enrichWithForagerPhone(context.officerId, tx)
          break
        }

        case 'contactout_phone': {
          providerPhones = await enrichWithContactOutPhone(
            context.officerId,
            firstName,
            lastName,
          )
          break
        }

        default:
          logger.warn({
            msg: `[phone_waterfall] Unknown phone provider: ${providerConfig.name}`,
            event: 'unknown_phone_provider',
            metadata: {
              provider: providerConfig.name,
            },
          })
      }

      if (providerPhones.length > 0) {
        allPhonesData.push(...providerPhones)
        phonesFound = true
      }
    } catch (providerError) {
      logger.warn({
        msg: `[phone_waterfall] Phone provider ${providerConfig.name} failed, trying next`,
        event: 'phone_provider_failed',
        metadata: {
          officerId: context.officerId,
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

  // Insert all found phones
  if (allPhonesData.length > 0) {
    await insertEnrichmentCompanyOfficerPhones(allPhonesData, tx)

    logger.info({
      msg: '[phone_waterfall] Phone waterfall enrichment completed successfully',
      event: 'phone_waterfall_complete_success',
      metadata: {
        officerId: context.officerId,
        totalPhones: allPhonesData.length,
        phones: allPhonesData.map((p) => p.phone),
        providersUsed: Array.from(new Set(allPhonesData.map((p) => p.source))),
      },
    })

    return {
      success: true,
      phonesFound: allPhonesData.length,
      phones: allPhonesData.map((p) => p.phone),
      providersUsed: Array.from(new Set(allPhonesData.map((p) => p.source))),
    }
  }

  logger.info({
    msg: '[phone_waterfall] Phone waterfall enrichment completed with no results',
    event: 'phone_waterfall_complete_no_results',
    metadata: {
      officerId: context.officerId,
      providersAttempted: enabledProviders.length,
    },
  })

  return {
    success: false,
    phonesFound: 0,
    phones: [],
    providersUsed: [],
  }
}
