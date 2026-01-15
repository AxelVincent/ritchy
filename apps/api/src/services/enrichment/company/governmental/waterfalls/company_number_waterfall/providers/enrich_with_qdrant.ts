import { logger } from '@ritchy/logger'
import type { Place } from '../../../../../../../db/schema'
import { matchCompany } from '../../../../../../../external/langchain/company_matcher'
import { enhancedPappersSearch } from '../../../../../../../external/pappers/enhanced_search'
import type { InterantionalSearchV1 } from '../../../../../../../external/pappers/international_search_v1'
import { extractCompanyIdentifiers } from '../../../../../../../external/qdrant/queries/extract_company_identifiers'
import { enqueuePappersCompanyJob } from '../../../../../../../internal/bullmq/jobs/pappers/queue'
import {
  type ProviderError,
  type Result,
  createNoResultsError,
} from '../../../../../shared/types/error_handling'
import type { CompanyNumberResult } from '../index'

// const SUPPORTED_COUNTRIES = ['FR', 'UK', 'DE', 'ES', 'BE', 'CH', 'NL', 'LU']

// Country-specific search terms and identifiers
export const COUNTRY_IDENTIFIER_INFO = {
  FR: {
    terms: "SIREN, SIRET, RCS, numéro d'immatriculation",
    format: '9 digits (SIREN) or 14 digits (SIRET)',
    officialSources: [
      'infogreffe.fr',
      'pappers.fr',
      'societe.com',
      'annuaire-entreprises.data.gouv.fr',
    ],
    extraInfo:
      'The company number is the SIREN number for France. Keep the first 9 digits as the company number.',
  },
  UK: {
    terms: 'Company Number, Companies House number',
    format: '8 digits (may have leading zeros) or 2 letters + 6 digits',
    officialSources: [
      'companieshouse.gov.uk',
      'find-and-update.company-information.service.gov.uk',
    ],
    extraInfo: null,
  },
  DE: {
    terms: 'Handelsregisternummer, HRB, HRA',
    format: 'HRB/HRA followed by digits, or numeric ID',
    officialSources: [
      'handelsregister.de',
      'unternehmensregister.de',
      'northdata.de',
    ],
    extraInfo: null,
  },
  ES: {
    terms: 'CIF, NIF, Número de identificación fiscal',
    format: '9 characters (letter + 7 digits + letter/digit)',
    officialSources: ['rmc.es', 'einforma.com', 'axesor.es'],
    extraInfo: null,
  },
  BE: {
    terms: "Numéro d'entreprise, Enterprise number, KBO/BCE number",
    format: '10 digits (format: 0XXX.XXX.XXX)',
    officialSources: ['kbo-bce.be', 'companyweb.be'],
    extraInfo: null,
  },
  CH: {
    terms: 'CHE number, UID, Handelsregister',
    format: 'CHE-XXX.XXX.XXX or 9 digits',
    officialSources: ['zefix.ch', 'uid.admin.ch', 'moneyhouse.ch'],
    extraInfo: null,
  },
  NL: {
    terms: 'KVK nummer, Kamer van Koophandel number',
    format: '8 digits',
    officialSources: ['kvk.nl', 'openkvk.nl'],
    extraInfo: null,
  },
  LU: {
    terms: 'Numéro matricule, RCS Luxembourg',
    format: 'Letter + 5-7 digits or 6-8 digits',
    officialSources: ['lbr.lu', 'guichet.lu'],
    extraInfo: null,
  },
  NO: {
    terms: 'Organisasjonsnummer, Foretaksregisteret, MVA',
    format: '9 digits with modulus 11 check digit',
    officialSources: ['brreg.no', 'proff.no', 'foretaksregisteret.brreg.no'],
    extraInfo:
      'The organisasjonsnummer is the official company registration number in Norway.',
  },
} as const

// Helper function to detect placeholder values from LLM
const isPlaceholderValue = (value: string | null | undefined): boolean => {
  if (!value) return true
  const placeholders = [
    '<UNKNOWN>',
    'UNKNOWN',
    'MISSING',
    'N/A',
    'NOT_FOUND',
    'NULL',
    'NONE',
    'NOT FULLY SPECIFIED',
    'NOTFULLYSPECIFIED',
    'NOT_SPECIFIED',
    'NOTSPECIFIED',
    'NOT PROVIDED',
    'NOTPROVIDED',
  ]
  return placeholders.some((placeholder) =>
    value.toUpperCase().includes(placeholder),
  )
}

/**
 * Provider function for Qdrant vector search + Pappers validation
 * Extracts identifiers from website content, then validates with Pappers
 */
export const enrichWithQdrant = async (
  place: Place,
  searchParams: InterantionalSearchV1,
): Promise<Result<CompanyNumberResult, ProviderError>> => {
  try {
    // Only works if website is available
    if (!place.website) {
      logger.debug({
        msg: '[company_number_waterfall] No website available for Qdrant search',
        event: 'qdrant_no_website',
        metadata: { placeName: place.name },
      })

      return {
        success: false,
        error: createNoResultsError('qdrant', {
          reason: 'no_website',
          placeName: place.name,
        }),
      }
    }

    logger.debug({
      msg: '[company_number_waterfall] Attempting Qdrant identifier extraction',
      event: 'qdrant_provider_start',
      metadata: {
        placeName: place.name,
        website: place.website,
        countryCode: searchParams.countryCode,
      },
    })

    // Extract company identifiers from website vectors
    const companyIdentifiers = await extractCompanyIdentifiers(place.website)

    if (!companyIdentifiers) {
      logger.info({
        msg: '[company_number_waterfall] No identifiers extracted from Qdrant',
        event: 'qdrant_no_identifiers',
        metadata: { placeName: place.name, website: place.website },
      })

      return {
        success: false,
        error: createNoResultsError('qdrant', {
          placeName: place.name,
          website: place.website,
        }),
      }
    }

    // Scenario 1: Direct company number lookup (companyNumber, sirenNumber, siretNumber)
    const directIdentifiers = [
      {
        type: 'companyNumber' as const,
        value: companyIdentifiers.companyNumber,
      },
      { type: 'sirenNumber' as const, value: companyIdentifiers.sirenNumber },
      { type: 'siretNumber' as const, value: companyIdentifiers.siretNumber },
    ].filter((id) => id.value && !isPlaceholderValue(id.value))

    for (const { type, value } of directIdentifiers) {
      if (!value) continue

      logger.debug({
        msg: '[company_number_waterfall] Attempting direct company lookup',
        event: 'qdrant_direct_lookup_attempt',
        metadata: {
          identifierType: type,
          identifier: value,
          countryCode: searchParams.countryCode,
        },
      })

      // Get country-specific info for validation
      const countryInfo =
        COUNTRY_IDENTIFIER_INFO[
          searchParams.countryCode as keyof typeof COUNTRY_IDENTIFIER_INFO
        ]

      // Transform identifier based on country-specific rules
      let transformedValue = value

      // Special handling for France: SIRET to SIREN conversion
      if (searchParams.countryCode === 'FR' && type === 'siretNumber') {
        transformedValue = value.substring(0, 9) // Extract SIREN from SIRET
        logger.debug({
          msg: '[company_number_waterfall] Transformed SIRET to SIREN for France',
          event: 'qdrant_siret_to_siren',
          metadata: {
            original: value,
            transformed: transformedValue,
          },
        })
      }

      try {
        // Try to fetch company directly with the identifier
        const companyData = await enqueuePappersCompanyJob({
          countryCode: searchParams.countryCode,
          companyNumber: transformedValue,
        })

        logger.info({
          msg: '[company_number_waterfall] Company data retrieved directly',
          event: 'qdrant_direct_lookup_success',
          metadata: {
            companyName: companyData.name,
            companyNumber: companyData.company_number,
            identifierType: type,
          },
        })

        // Compare the result with place data to ensure it's the right company
        const matchResult = await matchCompany(place, {
          results: [companyData],
          total: 1,
          page: 1,
          hasMoreResults: false,
        })

        if (matchResult.bestMatch && matchResult.bestMatch.confidence >= 60) {
          // Boost confidence when using extracted identifiers
          const identifierConfidenceBoost = Math.min(
            20,
            companyIdentifiers.confidence / 5,
          )
          const boostedConfidence = Math.min(
            100,
            matchResult.bestMatch.confidence + identifierConfidenceBoost,
          )

          logger.info({
            msg: '[company_number_waterfall] Direct lookup validated successfully',
            event: 'qdrant_direct_lookup_validated',
            metadata: {
              placeName: place.name,
              companyNumber: companyData.company_number,
              originalConfidence: matchResult.bestMatch.confidence,
              boostedConfidence: boostedConfidence,
              identifierType: type,
            },
          })

          return {
            success: true,
            data: {
              companyNumber: companyData.company_number,
              confidence: boostedConfidence,
              reasoning: `Found via direct ${type} lookup: ${companyIdentifiers.reasoning}. Match validation: ${matchResult.bestMatch.reasoning}`,
            },
            metadata: {
              identifier: value,
              identifierType: type,
              extractionConfidence: companyIdentifiers.confidence,
              validationConfidence: matchResult.bestMatch.confidence,
              countryInfo: countryInfo?.extraInfo,
            },
          }
        }

        logger.info({
          msg: '[company_number_waterfall] Direct lookup failed validation',
          event: 'qdrant_direct_lookup_validation_failed',
          metadata: {
            placeName: place.name,
            companyName: companyData.name,
            confidence: matchResult.bestMatch?.confidence || 0,
            identifierType: type,
          },
        })
      } catch (error) {
        logger.debug({
          msg: '[company_number_waterfall] Direct lookup failed',
          event: 'qdrant_direct_lookup_error',
          metadata: {
            identifierType: type,
            identifier: transformedValue,
            error: error instanceof Error ? error.message : String(error),
          },
        })
        // Continue to next identifier or fallback to search
      }
    }

    // Scenario 2: Search-based lookup (vatNumber, operatedByName, tradingName)
    const searchIdentifiers = [
      companyIdentifiers.vatNumber?.replace(/^[A-Z]{2}/, ''), // Remove country prefix from VAT
      companyIdentifiers.operatedByName,
      companyIdentifiers.tradingName,
    ].filter((identifier) => identifier && !isPlaceholderValue(identifier))

    logger.info({
      msg: '[company_number_waterfall] Identifiers extracted from Qdrant',
      event: 'qdrant_identifiers_extracted',
      metadata: {
        placeName: place.name,
        directIdentifiersCount: directIdentifiers.length,
        searchIdentifiersCount: searchIdentifiers.length,
        confidence: companyIdentifiers.confidence,
      },
    })

    // Try each search identifier with Pappers search
    for (const identifier of searchIdentifiers) {
      logger.debug({
        msg: '[company_number_waterfall] Validating identifier with Pappers search',
        event: 'qdrant_pappers_search_validation',
        metadata: {
          identifier,
          countryCode: searchParams.countryCode,
        },
      })

      const result = await enhancedPappersSearch(
        place,
        {
          countryCode: searchParams.countryCode,
          q: identifier ?? '',
        },
        true, // Skip name cleaning for identifier searches
      )

      if (result.bestMatch) {
        const confidence = result.bestMatch.confidence

        // Boost confidence when using extracted identifiers
        const identifierConfidenceBoost = Math.min(
          20,
          companyIdentifiers.confidence / 5,
        )
        const boostedConfidence = Math.min(
          100,
          confidence + identifierConfidenceBoost,
        )

        logger.info({
          msg: '[company_number_waterfall] Company number found via Qdrant + Pappers search',
          event: 'qdrant_company_number_found',
          metadata: {
            placeName: place.name,
            companyNumber: result.bestMatch.company_number,
            originalConfidence: confidence,
            boostedConfidence: boostedConfidence,
            identifier,
          },
        })

        return {
          success: true,
          data: {
            companyNumber: result.bestMatch.company_number,
            confidence: boostedConfidence,
            reasoning: `Found via website identifier extraction (${identifier}): ${companyIdentifiers.reasoning}`,
          },
          metadata: {
            identifier,
            extractionConfidence: companyIdentifiers.confidence,
            originalConfidence: confidence,
            searchAttempts: result.searchAttempts,
          },
        }
      }
    }

    // No match found with any identifier
    logger.info({
      msg: '[company_number_waterfall] No valid match found via Qdrant identifiers',
      event: 'qdrant_no_match',
      metadata: {
        placeName: place.name,
        directIdentifiersAttempted: directIdentifiers.length,
        searchIdentifiersAttempted: searchIdentifiers.length,
      },
    })

    return {
      success: false,
      error: createNoResultsError('qdrant', {
        placeName: place.name,
        identifiersAttempted:
          directIdentifiers.length + searchIdentifiers.length,
      }),
    }
  } catch (error) {
    logger.error({
      msg: '[company_number_waterfall] Unexpected error in Qdrant provider',
      event: 'qdrant_unexpected_error',
      metadata: {
        placeName: place.name,
        error: error instanceof Error ? error.message : String(error),
      },
    })

    return {
      success: false,
      error: {
        type: 'unknown',
        provider: 'qdrant',
        message: 'Unexpected error occurred during identifier extraction',
        isRetryable: true,
        context: { placeName: place.name, website: place.website },
        cause: error instanceof Error ? error : undefined,
      },
    }
  }
}
