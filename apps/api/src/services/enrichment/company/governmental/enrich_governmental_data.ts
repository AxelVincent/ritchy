import { logger } from '@ritchy/logger'
import { countryToAlpha2 } from 'country-to-iso'
import type { Place } from '../../../../db/schema'
import { PAPPERS_COUNTRY_CODES } from '../../../../external/pappers/international_company_v1'
import { enqueuePappersCompanyJob } from '../../../../internal/bullmq/jobs/pappers/queue'
import type { EnrichmentContext } from '../../shared/status/status_builder'
import { isValidCompanyNumber } from './company_number_validators'
import { insertEnrichmentCompany } from './insert_enrichment_company'
import { runCompanyNumberWaterfall } from './waterfalls/company_number_waterfall'

// Helper function to map ISO alpha-2 codes to Pappers country codes
const mapToPappersCountryCode = (isoCountryCode: string | null): string => {
  if (!isoCountryCode) return ''
  const countryCodeMapping: Record<string, string> = {
    GB: 'UK',
    FR: 'FR',
    BE: 'BE',
    CH: 'CH',
    NL: 'NL',
    LU: 'LU',
    DE: 'DE',
    ES: 'ES',
    NO: 'NO',
  }

  return countryCodeMapping[isoCountryCode] || isoCountryCode
}

const CONFIDENCE_THRESHOLD = 70

export const enrichGovernmentalData = async ({
  place,
  enrichmentId,
  context,
}: {
  place: Place
  enrichmentId: string
  context?: EnrichmentContext
}) => {
  const isoCountryCode = countryToAlpha2(place.country ?? '')
  const countryCode = mapToPappersCountryCode(isoCountryCode)
  const parsedCountryCode = PAPPERS_COUNTRY_CODES.safeParse(countryCode)

  if (!place.name || !isoCountryCode || !parsedCountryCode.success) {
    logger.warn({
      msg: '[enrich_governmental_data] Invalid place name or country code',
      event: 'governmental_data_invalid_place',
      metadata: {
        placeName: place.name,
        isoCountryCode,
        countryCode,
        parsedCountryCode,
      },
    })
    return { companyData: null, searchMethod: 'invalid_input' }
  }

  const searchQuery = place.name
  let bestMatch = null
  let searchMethod = 'name_only'
  let waterfallMetadata = null

  // Try company number waterfall (Qdrant → Pappers)
  logger.debug({
    msg: '[enrich_governmental_data] Starting company number waterfall',
    event: 'governmental_data_waterfall_start',
    metadata: { placeName: place.name, countryCode: parsedCountryCode.data },
  })

  const waterfallResult = await runCompanyNumberWaterfall(
    { place, countryCode: parsedCountryCode.data },
    { countryCode: parsedCountryCode.data, q: searchQuery },
    CONFIDENCE_THRESHOLD,
  )

  if (waterfallResult.status === 'success') {
    searchMethod = `waterfall_${waterfallResult.provider}`
    waterfallMetadata = waterfallResult.metadata

    // Convert waterfall result to bestMatch format
    bestMatch = {
      company_number: waterfallResult.data.companyNumber,
      confidence: waterfallResult.data.confidence,
      reasoning: waterfallResult.data.reasoning,
    }

    logger.info({
      msg: '[enrich_governmental_data] Company number found via waterfall',
      event: 'governmental_data_waterfall_success',
      metadata: {
        provider: waterfallResult.provider,
        confidence: waterfallResult.confidence,
        companyNumber: waterfallResult.data.companyNumber,
      },
    })
  } else {
    logger.info({
      msg: '[enrich_governmental_data] Company number waterfall did not find a match',
      event: 'governmental_data_waterfall_no_match',
      metadata: {
        status: waterfallResult.status,
        reason:
          waterfallResult.status === 'empty'
            ? waterfallResult.reason
            : undefined,
        error:
          waterfallResult.status === 'failed'
            ? waterfallResult.error
            : undefined,
        providersAttempted: waterfallResult.providersAttempted,
      },
    })
  }

  // Single company data fetch if we have a good match
  if (bestMatch && bestMatch.confidence >= CONFIDENCE_THRESHOLD) {
    // Validate company number format before making API call
    if (
      !isValidCompanyNumber(bestMatch.company_number, parsedCountryCode.data)
    ) {
      logger.warn({
        msg: '[enrich_governmental_data] Invalid company number format - rejecting match',
        event: 'governmental_data_invalid_company_number',
        metadata: {
          companyNumber: bestMatch.company_number,
          countryCode: parsedCountryCode.data,
          placeName: place.name,
          confidence: bestMatch.confidence,
          searchMethod,
        },
      })

      return {
        companyData: null,
        searchResult: bestMatch,
        searchMethod,
        waterfallMetadata,
        confidence: bestMatch.confidence,
        error: 'Invalid company number format',
      }
    }

    logger.info({
      msg: '[enrich_governmental_data] Good match found, fetching company data',
      event: 'governmental_data_match_found',
      metadata: {
        companyNumber: bestMatch.company_number,
        confidence: bestMatch.confidence,
        searchMethod,
      },
    })

    try {
      const companyData = await enqueuePappersCompanyJob({
        countryCode: parsedCountryCode.data,
        companyNumber: bestMatch.company_number,
        fields: [
          'officers',
          'ubos',
          'financials',
          'certificates',
          'establishments',
          'contacts',
        ],
      })

      logger.info({
        msg: '[enrich_governmental_data] Company data retrieved successfully',
        event: 'governmental_data_company_data_retrieved',
        metadata: {
          companyNumber: bestMatch.company_number,
          companyName: companyData.name,
          searchMethod,
        },
      })

      // Insert company data into database
      try {
        await insertEnrichmentCompany(
          enrichmentId,
          companyData,
          bestMatch,
          context?.tx,
        )

        logger.info({
          msg: '[enrich_governmental_data] Company data inserted into database',
          event: 'governmental_data_company_inserted',
          metadata: {
            enrichmentId,
            companyNumber: companyData.company_number,
            companyName: companyData.name,
          },
        })
      } catch (insertError) {
        logger.error({
          msg: '[enrich_governmental_data] Failed to insert company data into database',
          event: 'governmental_data_company_insert_error',
          metadata: {
            companyNumber: companyData.company_number,
            error:
              insertError instanceof Error
                ? insertError.message
                : String(insertError),
          },
        })
      }

      return {
        companyData,
        searchMethod,
        waterfallMetadata,
        confidence: bestMatch.confidence,
      }
    } catch (error) {
      logger.error({
        msg: '[enrich_governmental_data] Failed to fetch company data',
        event: 'governmental_data_company_fetch_error',
        metadata: {
          companyNumber: bestMatch.company_number,
          error: error instanceof Error ? error.message : String(error),
        },
      })

      return {
        companyData: null,
        searchResult: bestMatch,
        searchMethod,
        waterfallMetadata,
        confidence: bestMatch.confidence,
        error: 'Failed to fetch company data',
      }
    }
  }

  logger.info({
    msg: '[enrich_governmental_data] No acceptable match found or confidence too low',
    event: 'governmental_data_no_match',
    metadata: {
      placeName: place.name,
      bestMatchConfidence: bestMatch?.confidence,
      searchMethod,
    },
  })

  return {
    companyData: null,
    searchMethod,
    waterfallMetadata,
  }
}
