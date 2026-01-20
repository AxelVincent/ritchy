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
import { isValidStrictCountryFormat } from '../../../company_number_validators'
import type { CompanyNumberResult } from '../index'

// const SUPPORTED_COUNTRIES = ['FR', 'UK', 'DE', 'ES', 'BE', 'CH', 'NL', 'LU']

/**
 * Country-specific company identifier information
 * Used for AI extraction guidance and validation context
 *
 * IMPORTANT: These formats are for OFFICIAL national registration numbers,
 * NOT Pappers internal IDs. Website extractions should match these formats.
 */
export const COUNTRY_IDENTIFIER_INFO = {
  FR: {
    terms: "SIREN, SIRET, RCS, numéro d'immatriculation, N° SIREN",
    format: '9 digits (SIREN) or 14 digits (SIRET) with Luhn check digit',
    pattern: 'SIREN: 123456789, SIRET: 12345678901234',
    examples: ['732829320', '552032534', '55203253400646'],
    officialSources: [
      'infogreffe.fr',
      'pappers.fr',
      'societe.com',
      'annuaire-entreprises.data.gouv.fr',
    ],
    websiteLocations: ['mentions légales', 'footer', 'contact', 'CGV'],
    extraInfo:
      'The company number is the SIREN (9 digits). SIRET = SIREN + NIC (5 digits). Both must pass Luhn algorithm validation.',
  },
  UK: {
    terms: 'Company Number, Companies House number, Registration Number, CRN',
    format: '8 characters: either 8 digits OR 2-letter prefix + 6 digits',
    pattern: 'England/Wales: 01234567, Scotland: SC123456, NI: NI123456',
    examples: ['01234567', 'SC123456', 'NI123456', 'OC123456'],
    officialSources: [
      'companieshouse.gov.uk',
      'find-and-update.company-information.service.gov.uk',
    ],
    websiteLocations: ['footer', 'about us', 'legal', 'terms'],
    extraInfo:
      'Valid prefixes: SC (Scotland), NI (Northern Ireland), OC (LLP England/Wales), SO (LLP Scotland), NC (LLP NI), RC, IP, AC, FS, FC.',
  },
  DE: {
    terms: 'Handelsregisternummer, HRB, HRA, Registernummer, Amtsgericht',
    format: 'Prefix (HRB/HRA/GnR/PR/VR) + 1-7 digits, or 4-8 digits only',
    pattern: 'HRB 12345, HRA 54321, GnR 1234, 123456',
    examples: ['HRB12345', 'HRA54321', 'GnR1234', '123456'],
    officialSources: [
      'handelsregister.de',
      'unternehmensregister.de',
      'northdata.de',
    ],
    websiteLocations: ['Impressum', 'Kontakt', 'footer'],
    extraInfo:
      'HRB = incorporated companies (GmbH, AG), HRA = partnerships/sole traders, GnR = cooperatives, VR = associations. Court context often included.',
  },
  ES: {
    terms:
      'CIF, NIF, Número de identificación fiscal, Código de identificación fiscal',
    format: 'Letter + 7 digits + control character (9 characters total)',
    pattern: 'B12345678 (SL), A12345670 (SA), Q2812345J (public)',
    examples: ['B12345678', 'A28123456', 'Q2812345J', 'G12345670'],
    officialSources: ['rmc.es', 'einforma.com', 'axesor.es', 'librebor.me'],
    websiteLocations: ['aviso legal', 'footer', 'contacto', 'condiciones'],
    extraInfo:
      'First letter = entity type: A (SA), B (SL), C-H (other), N (foreign), P-S (public). Control char: A/B/E/H require digit, K/P/Q/S require letter A-J.',
  },
  BE: {
    terms:
      "Numéro d'entreprise, Ondernemingsnummer, Enterprise number, KBO/BCE, BTW/TVA",
    format: '10 digits starting with 0 or 1, with modulo-97 check digit',
    pattern: '0XXX.XXX.XXX or BE 0XXX.XXX.XXX',
    examples: ['0123456749', 'BE0123456749', '0000000196'],
    officialSources: ['kbo-bce.be', 'companyweb.be', 'staatsbladmonitor.be'],
    websiteLocations: [
      'mentions légales',
      'footer',
      'contact',
      'algemene voorwaarden',
    ],
    extraInfo:
      'Check digit = 97 - (first 8 digits mod 97). Often displayed with BE prefix for VAT purposes.',
  },
  CH: {
    terms:
      'CHE number, UID, Unternehmens-Identifikationsnummer, MWST, TVA, IVA',
    format: 'CHE-XXX.XXX.XXX with modulo-11 check digit, or 9 digits',
    pattern: 'CHE-123.456.789, CHE-123.456.789 MWST',
    examples: ['CHE-109.322.551', 'CHE109322551', '109322551'],
    officialSources: ['zefix.ch', 'uid.admin.ch', 'moneyhouse.ch'],
    websiteLocations: ['Impressum', 'Kontakt', 'footer', 'AGB'],
    extraInfo:
      'VAT suffix varies by language region: MWST (German), TVA (French), IVA (Italian). Check digit uses modulo-11 algorithm.',
  },
  NL: {
    terms:
      'KVK nummer, Kamer van Koophandel, Chamber of Commerce number, Handelsregister',
    format: '8 digits exactly',
    pattern: '12345678',
    examples: ['12345678', '00000001', '99999999'],
    officialSources: ['kvk.nl', 'openkvk.nl', 'companyinfo.nl'],
    websiteLocations: ['footer', 'contact', 'algemene voorwaarden', 'over ons'],
    extraInfo:
      'No public check digit algorithm. Dutch VAT (BTW) number is different format.',
  },
  LU: {
    terms: 'Numéro matricule, RCS Luxembourg, Registre de Commerce',
    format:
      'Letter prefix (B/A/C/D/F/G/J) + 5-7 digits, or 6-8 digits for legacy',
    pattern: 'B123456, A12345, J1234567',
    examples: ['B123456', 'B1234567', 'A12345', '123456'],
    officialSources: ['lbr.lu', 'guichet.lu', 'rcsl.lu'],
    websiteLocations: ['mentions légales', 'footer', 'contact'],
    extraInfo:
      'B = commercial companies (SARL, SA), A = civil, C = branches, J = sole traders. No check digit.',
  },
  NO: {
    terms: 'Organisasjonsnummer, Foretaksregisteret, MVA, Org.nr',
    format: '9 digits with modulo-11 check digit (last digit)',
    pattern: '123456789, NO 123456789 MVA (VAT)',
    examples: ['923609016', '912345678'],
    officialSources: ['brreg.no', 'proff.no', 'foretaksregisteret.brreg.no'],
    websiteLocations: ['footer', 'kontakt', 'om oss', 'juridisk informasjon'],
    extraInfo:
      'Check digit uses modulo-11 with weights [3,2,7,6,5,4,3,2]. Numbers requiring check digit 10 are invalid and not issued.',
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

      // Validate extracted company number against strict country format
      // This ensures website-extracted numbers match official national formats
      if (
        !isValidStrictCountryFormat(transformedValue, searchParams.countryCode)
      ) {
        logger.info({
          msg: '[company_number_waterfall] Extracted company number failed strict country format validation',
          event: 'qdrant_invalid_country_format',
          metadata: {
            identifierType: type,
            identifier: transformedValue,
            countryCode: searchParams.countryCode,
            placeName: place.name,
          },
        })
        continue // Skip this identifier and try the next one
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
