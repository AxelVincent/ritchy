import { logger } from '@ritchy/logger'
import { countryToAlpha2 } from 'country-to-iso'
import type { Place } from '../../../db/schema'
import { enhancedPappersSearch } from '../../../external/pappers/enhanced_search'

import { PAPPERS_COUNTRY_CODES } from '../../../external/pappers/international_company_v1'
import { extractCompanyIdentifiers } from '../../../external/qdrant/queries/extract_company_identifiers'
import { enqueuePappersCompanyJob } from '../../../internal/bullmq/jobs/pappers/queue'
import { insertEnrichmentCompany } from './insert_enrichment_company'

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
  }

  return countryCodeMapping[isoCountryCode] || isoCountryCode
}

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
  ]
  return placeholders.some((placeholder) =>
    value.toUpperCase().includes(placeholder),
  )
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

    default: {
      // For unknown countries, basic validation: at least 3 characters
      // This allows flexibility while catching obvious errors like "30"
      return cleaned.length >= 3 && /^[A-Z0-9]+$/i.test(cleaned)
    }
  }
}

export const enrichGovernmentalData = async ({
  place,
  enrichmentId,
}: { place: Place; enrichmentId: string }) => {
  const isoCountryCode = countryToAlpha2(place.country ?? '')
  const countryCode = mapToPappersCountryCode(isoCountryCode)
  const parsedCountryCode = PAPPERS_COUNTRY_CODES.safeParse(countryCode)

  if (!place.name || !isoCountryCode || !parsedCountryCode.success) {
    logger.warn({
      msg: '[pappers] Invalid place name or country code',
      event: 'governmental_data_invalid_place',
      metadata: {
        placeName: place.name,
        isoCountryCode,
        countryCode,
        parsedCountryCode,
      },
    })
    return { companyData: null, searchAttempts: 0 }
  }

  const searchQuery = place.name
  let searchAttempts = 0
  let bestMatch = null
  let searchMethod = 'name_only'
  let extractedIdentifiers = null
  let identifierUsed = null

  // First try: Extract company identifiers from website if available
  if (place.website) {
    logger.debug({
      msg: '[pappers] Attempting to extract company identifiers from website',
      event: 'governmental_data_website_extraction_start',
      metadata: { website: place.website, placeName: place.name },
    })

    try {
      const companyIdentifiers = await extractCompanyIdentifiers(place.website)

      if (companyIdentifiers) {
        logger.info({
          msg: '[pappers] Company identifiers extracted from website',
          event: 'governmental_data_identifiers_extracted',
          metadata: {
            placeName: place.name,
            website: place.website,
            companyNumber: companyIdentifiers.companyNumber,
            vatNumber: companyIdentifiers.vatNumber,
            sirenNumber: companyIdentifiers.sirenNumber,
            siretNumber: companyIdentifiers.siretNumber,
            confidence: companyIdentifiers.confidence,
          },
        })

        // Try searching with the most specific identifier first
        const identifiersToTry = [
          companyIdentifiers.companyNumber,
          companyIdentifiers.sirenNumber,
          companyIdentifiers.siretNumber,
          companyIdentifiers.vatNumber?.replace(/^[A-Z]{2}/, ''), // Remove country prefix from VAT
          companyIdentifiers.operatedByName,
          companyIdentifiers.tradingName,
        ].filter((identifier) => identifier && !isPlaceholderValue(identifier))

        for (const identifier of identifiersToTry) {
          logger.debug({
            msg: '[pappers] Searching with extracted identifier',
            event: 'governmental_data_identifier_search',
            metadata: { identifier, countryCode: parsedCountryCode.data },
          })

          const result = await enhancedPappersSearch(
            place,
            {
              countryCode: parsedCountryCode.data,
              q: identifier ?? '',
            },
            true, // Skip name cleaning for identifier searches
          )

          logger.info({
            msg: '[pappers] Result from identifier search',
            event: 'governmental_data_identifier_search_result',
            metadata: { result },
          })

          searchAttempts++

          if (result.bestMatch) {
            const confidence = result.bestMatch.confidence

            // SIMPLE BOOST: When using extracted identifiers, boost confidence
            const identifierConfidenceBoost = Math.min(
              20,
              companyIdentifiers.confidence / 5,
            )
            const boostedConfidence = Math.min(
              100,
              confidence + identifierConfidenceBoost,
            )

            // Apply the boost
            result.bestMatch.confidence = boostedConfidence

            logger.info({
              msg: '[pappers] Match found with extracted identifier - confidence boosted',
              event: 'governmental_data_identifier_match_found',
              metadata: {
                identifier,
                companyNumber: result.bestMatch.company_number,
                originalConfidence: confidence,
                boostedConfidence: boostedConfidence,
                identifierConfidence: companyIdentifiers.confidence,
                boost: identifierConfidenceBoost,
                searchAttempts,
              },
            })

            // Stop the loop for any reasonable match since we're using exact identifiers
            // Identifier-based searches should be highly accurate
            if (boostedConfidence >= 70) {
              logger.info({
                msg: '[pappers] Accepting identifier-based match',
                event: 'governmental_data_identifier_match_accepted',
                metadata: {
                  identifier,
                  companyNumber: result.bestMatch.company_number,
                  confidence: boostedConfidence,
                  searchAttempts,
                },
              })

              result.bestMatch.reasoning = companyIdentifiers.reasoning
              bestMatch = result.bestMatch
              searchMethod = 'identifier_extraction'
              extractedIdentifiers = companyIdentifiers
              identifierUsed = identifier
              break
            }

            // For lower confidence matches, log but continue trying other identifiers
            logger.debug({
              msg: '[pappers] Low confidence identifier match, trying next identifier',
              event: 'governmental_data_identifier_low_confidence',
              metadata: {
                identifier,
                confidence,
                threshold: 70,
              },
            })
          } else {
            logger.debug({
              msg: '[pappers] No match found with identifier',
              event: 'governmental_data_identifier_no_match',
              metadata: { identifier },
            })
          }
        }

        if (!bestMatch) {
          logger.debug({
            msg: '[pappers] No acceptable matches with any identifiers, falling back to name search',
            event: 'governmental_data_identifier_fallback',
            metadata: {
              searchAttempts,
              identifiersSearched: identifiersToTry.length,
            },
          })
          searchMethod = 'identifier_then_name'
        }
      } else {
        logger.debug({
          msg: '[pappers] No company identifiers found in website content',
          event: 'governmental_data_no_identifiers_found',
          metadata: { website: place.website },
        })
      }
    } catch (error) {
      logger.warn({
        msg: '[pappers] Failed to extract company identifiers from website',
        event: 'governmental_data_identifier_extraction_error',
        metadata: {
          website: place.website,
          error: error instanceof Error ? error.message : String(error),
        },
      })
    }
  }

  // Fallback: Enhanced search by name (only if no match found yet)
  if (!bestMatch) {
    logger.debug({
      msg: '[pappers] Starting enhanced Pappers search by name',
      event: 'enhanced_pappers_search_start',
      metadata: { countryCode: parsedCountryCode.data, placeName: place.name },
    })

    const result = await enhancedPappersSearch(place, {
      countryCode: parsedCountryCode.data,
      q: searchQuery,
    })

    searchAttempts += result.searchAttempts
    bestMatch = result.bestMatch
  }

  // Single company data fetch if we have a good match
  if (bestMatch && bestMatch.confidence >= 70) {
    // Validate company number format before making API call
    if (
      !isValidCompanyNumber(bestMatch.company_number, parsedCountryCode.data)
    ) {
      logger.error({
        msg: '[pappers] Invalid company number format - rejecting match',
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
        searchAttempts,
        searchMethod,
        extractedIdentifiers,
        identifierUsed,
        confidence: bestMatch.confidence,
        error: 'Invalid company number format',
      }
    }

    logger.info({
      msg: '[pappers] Good match found, fetching company data',
      event: 'governmental_data_match_found',
      metadata: {
        companyNumber: bestMatch.company_number,
        confidence: bestMatch.confidence,
        searchAttempts,
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
        msg: '[pappers] Company data retrieved successfully',
        event: 'governmental_data_company_data_retrieved',
        metadata: {
          companyNumber: bestMatch.company_number,
          companyName: companyData.name,
          searchMethod,
        },
      })

      // Insert company data into database
      try {
        await insertEnrichmentCompany(enrichmentId, companyData, bestMatch)

        logger.info({
          msg: '[pappers] Company data inserted into database',
          event: 'governmental_data_company_inserted',
          metadata: {
            enrichmentId,
            companyNumber: companyData.company_number,
            companyName: companyData.name,
          },
        })
      } catch (insertError) {
        logger.error({
          msg: '[pappers] Failed to insert company data into database',
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
        searchAttempts,
        searchMethod,
        extractedIdentifiers,
        identifierUsed,
        confidence: bestMatch.confidence,
      }
    } catch (error) {
      logger.error({
        msg: '[pappers] Failed to fetch company data',
        event: 'governmental_data_company_fetch_error',
        metadata: {
          companyNumber: bestMatch.company_number,
          error: error instanceof Error ? error.message : String(error),
        },
      })

      return {
        companyData: null,
        searchResult: bestMatch,
        searchAttempts,
        searchMethod,
        extractedIdentifiers,
        identifierUsed,
        confidence: bestMatch.confidence,
        error: 'Failed to fetch company data',
      }
    }
  }

  logger.info({
    msg: '[pappers] No acceptable match found or confidence too low',
    event: 'governmental_data_no_match',
    metadata: {
      placeName: place.name,
      bestMatchConfidence: bestMatch?.confidence,
      totalSearchAttempts: searchAttempts,
      searchMethod,
    },
  })

  return {
    companyData: null,
    searchAttempts,
    searchMethod,
  }
}
