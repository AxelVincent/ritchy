import { logger } from '@ritchy/logger'
import { countryToAlpha2 } from 'country-to-iso'
import type { Place } from '../../../../db/schema'
import { PAPPERS_COUNTRY_CODES } from '../../../../external/pappers/international_company_v1'
import { enqueuePappersCompanyJob } from '../../../../internal/bullmq/jobs/pappers/queue'
import type { EnrichmentContext } from '../../shared/status/status_builder'
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

// Helper function to validate company number format based on country code
const isValidCompanyNumber = (
  companyNumber: string,
  countryCode: string,
): boolean => {
  if (!companyNumber || typeof companyNumber !== 'string') {
    return false
  }

  // Remove spaces and common separators for validation
  const cleaned = companyNumber.replace(/[\s.-]/g, '')

  // Country-specific validation rules
  switch (countryCode) {
    case 'FR': {
      // French SIREN: 9 digits, SIRET: 14 digits
      // Accept both formats
      return /^\d{9}$/.test(cleaned) || /^\d{14}$/.test(cleaned)
    }

    case 'UK': {
      // UK company number: typically 8 digits (may have leading zeros)
      // Can also be 6-8 digits
      return /^\d{6,8}$/.test(cleaned)
    }

    case 'DE': {
      // German Handelsregisternummer: HRB followed by digits, or just digits
      // Format: HRB XXXXX or just digits (typically 4-6 digits)
      const hrbFormat = /^HRB\s*\d{4,6}$/i.test(companyNumber)
      const digitsOnly = /^\d{4,8}$/.test(cleaned)
      return hrbFormat || digitsOnly
    }

    case 'BE': {
      // Belgian enterprise number: 10 digits
      return /^\d{10}$/.test(cleaned)
    }

    case 'CH': {
      // Swiss CHE number: CHE-XXX.XXX.XXX format or 9 digits
      const cheFormat = /^CHE-\d{3}\.\d{3}\.\d{3}$/i.test(companyNumber)
      const digitsOnly = /^\d{9}$/.test(cleaned)
      return cheFormat || digitsOnly
    }

    case 'NL': {
      // Dutch KVK number: 8 digits
      return /^\d{8}$/.test(cleaned)
    }

    case 'LU': {
      // Luxembourg RCS: various formats, typically 6-8 digits or B followed by digits
      const rcsFormat = /^[BR]\d{5,7}$/i.test(companyNumber)
      const digitsOnly = /^\d{6,8}$/.test(cleaned)
      return rcsFormat || digitsOnly
    }

    case 'ES': {
      // Spanish CIF/NIF: 9 characters (alphanumeric), starts with letter or number
      // Format: X12345678 or 12345678X
      return /^[A-Z0-9]\d{7}[A-Z0-9]$/i.test(cleaned)
    }

    case 'NO': {
      // Norwegian organisasjonsnummer: 9 digits with modulus 11 check digit
      if (!/^\d{9}$/.test(cleaned)) return false

      // Validate modulus 11 check digit
      const weights = [3, 2, 7, 6, 5, 4, 3, 2]
      const digits = cleaned.split('').map(Number)
      const sum = digits
        .slice(0, 8)
        .reduce((acc, digit, i) => acc + digit * weights[i], 0)
      const remainder = sum % 11
      // If remainder is 1, check digit would be 10 which is invalid
      if (remainder === 1) return false
      const expectedCheckDigit = remainder === 0 ? 0 : 11 - remainder

      return expectedCheckDigit === digits[8]
    }

    default: {
      // For unknown countries, basic validation: at least 3 characters
      // This allows flexibility while catching obvious errors like "30"
      return cleaned.length >= 3 && /^[A-Z0-9]+$/i.test(cleaned)
    }
  }
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
      logger.error({
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
