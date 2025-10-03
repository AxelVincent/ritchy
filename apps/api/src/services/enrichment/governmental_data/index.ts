import { logger } from '@ritchy/logger'
import { countryToAlpha2 } from 'country-to-iso'
import type { Place } from '../../../db/schema'
import { enhancedPappersSearch } from '../../../external/pappers/enhanced_search'

import { PAPPERS_COUNTRY_CODES } from '../../../external/pappers/international_company_v1'
import { extractCompanyIdentifiers } from '../../../external/qdrant/queries/extract_company_identifiers'
import { enqueuePappersCompanyJob } from '../../../internal/bullmq/jobs/pappers/queue'
import { insertEnrichmentCompany } from '../queries/insert_enrichment_company'

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

export const governmentalData = async ({
  place,
  enrichmentId,
}: { place: Place; enrichmentId: string }) => {
  const countryCode = countryToAlpha2(place.country ?? '')
  const parsedCountryCode = PAPPERS_COUNTRY_CODES.safeParse(countryCode)

  if (!place.name || !countryCode || !parsedCountryCode.success) {
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
