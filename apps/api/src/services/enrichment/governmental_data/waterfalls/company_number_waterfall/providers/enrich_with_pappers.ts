import { logger } from '@ritchy/logger'
import type { Place } from '../../../../../../db/schema'
import { enhancedPappersSearch } from '../../../../../../external/pappers/enhanced_search'
import type { InterantionalSearchV1 } from '../../../../../../external/pappers/international_search_v1'
import {
  type ProviderError,
  type Result,
  createNoResultsError,
} from '../../../../types/error_handling'
import type { CompanyNumberResult } from '../index'

/**
 * Provider function for Pappers enhanced search
 * Uses semantic search with company name + AI matching
 */
export const enrichWithPappers = async (
  place: Place,
  searchParams: InterantionalSearchV1,
): Promise<Result<CompanyNumberResult, ProviderError>> => {
  try {
    logger.debug({
      msg: '[company_number_waterfall] Attempting Pappers enhanced search',
      event: 'pappers_provider_start',
      metadata: {
        placeName: place.name,
        countryCode: searchParams.countryCode,
        query: searchParams.q,
      },
    })

    const result = await enhancedPappersSearch(place, {
      countryCode: searchParams.countryCode,
      q: searchParams.q,
    })

    // Handle success with results
    if (result.bestMatch) {
      logger.info({
        msg: '[company_number_waterfall] Company number found via Pappers',
        event: 'pappers_company_number_found',
        metadata: {
          placeName: place.name,
          companyNumber: result.bestMatch.company_number,
          confidence: result.bestMatch.confidence,
          searchAttempts: result.searchAttempts,
        },
      })

      return {
        success: true,
        data: {
          companyNumber: result.bestMatch.company_number,
          confidence: result.bestMatch.confidence,
          reasoning:
            result.bestMatch.reasoning ||
            'Found via Pappers semantic search and AI matching',
        },
        metadata: {
          searchAttempts: result.searchAttempts,
          totalResults: result.totalResults,
          pagesSearched: result.pagesSearched,
        },
      }
    }

    // No results
    logger.info({
      msg: '[company_number_waterfall] No company number found via Pappers',
      event: 'pappers_no_results',
      metadata: {
        placeName: place.name,
        searchAttempts: result.searchAttempts,
      },
    })

    return {
      success: false,
      error: createNoResultsError('pappers', {
        placeName: place.name,
        searchAttempts: result.searchAttempts,
      }),
    }
  } catch (error) {
    logger.error({
      msg: '[company_number_waterfall] Unexpected error in Pappers provider',
      event: 'pappers_unexpected_error',
      metadata: {
        placeName: place.name,
        error: error instanceof Error ? error.message : String(error),
      },
    })

    return {
      success: false,
      error: {
        type: 'unknown',
        provider: 'pappers',
        message: 'Unexpected error occurred during Pappers search',
        isRetryable: true,
        context: { placeName: place.name, query: searchParams.q },
        cause: error instanceof Error ? error : undefined,
      },
    }
  }
}
