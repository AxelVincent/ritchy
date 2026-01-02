import { logger } from '@ritchy/logger'

import { z } from 'zod'
import type { Place } from '../../db/schema'
import { enqueuePappersSearchJob } from '../../internal/bullmq/jobs/pappers/queue'
import {
  createSimpleDurationTimer,
  externalApiDurationHistogram,
  externalApiRequestsCounter,
} from '../../metrics/collectors'
import { matchCompany } from '../langchain/company_matcher'
import { cleanCompanyName } from '../langchain/company_name_cleaner'
import type { InterantionalSearchV1 } from './international_search_v1'

const CompanyMatchResultSchema = z.object({
  company_number: z.string(),
  confidence: z.number().min(0).max(100),
  reasoning: z.string(),
})

export type CompanyMatchResult = z.infer<typeof CompanyMatchResultSchema>

/**
 * Paginated search function that uses LLMs to intelligently search through multiple pages
 * when there are too many results to analyze efficiently
 */
const paginatedSearch = async (
  place: Place,
  searchParams: InterantionalSearchV1,
  maxPages = 5,
  resultsThreshold = 50,
) => {
  const metricsTimer = createSimpleDurationTimer(externalApiDurationHistogram)
  let httpStatusCode = '200'

  logger.info({
    msg: '[pappers] Starting paginated search',
    event: 'paginated_search_start',
    metadata: {
      query: searchParams.q,
      placeName: place.name,
      countryCode: searchParams.countryCode,
      maxPages,
      resultsThreshold,
    },
  })

  try {
    // First search to check total results - using queue
    const firstPageResults = await enqueuePappersSearchJob({
      ...searchParams,
      page: 1,
      perPage: resultsThreshold,
    })
    logger.info({
      msg: '[pappers] First page results',
      event: 'paginated_search_first_page_results',
      metadata: { firstPageResults, query: searchParams.q },
    })

    if (firstPageResults.total === 0) {
      logger.info({
        msg: '[pappers] No results found',
        event: 'paginated_search_no_results',
        metadata: { query: searchParams.q },
      })
      return {
        bestMatch: null,
        alternatives: [],
        searchResults: firstPageResults,
        searchAttempts: 1,
        totalResults: firstPageResults.total,
        pagesSearched: 1,
      }
    }

    // If we have few results, use regular matching
    if (firstPageResults.total <= resultsThreshold) {
      logger.info({
        msg: '[pappers] Few results found, using regular matching',
        event: 'paginated_search_few_results',
        metadata: { total: firstPageResults.total, query: searchParams.q },
      })

      const matchResult = await matchCompany(place, firstPageResults)
      return {
        bestMatch: matchResult.bestMatch,
        alternatives: matchResult.alternatives,
        searchResults: firstPageResults,
        searchAttempts: 1,
        totalResults: firstPageResults.total,
        pagesSearched: 1,
      }
    }

    // If we have many results, use paginated LLM-powered search
    logger.info({
      msg: '[pappers] Many results found, starting paginated LLM search',
      event: 'paginated_search_many_results',
      metadata: { total: firstPageResults.total, query: searchParams.q },
    })

    let bestMatch = null
    let bestConfidence = 0
    let bestAlternatives: CompanyMatchResult[] = []
    let currentPage = 1
    let searchedPages = 0

    while (currentPage <= maxPages && searchedPages < maxPages) {
      const pageResults =
        currentPage === 1
          ? firstPageResults
          : await enqueuePappersSearchJob({
              ...searchParams,
              page: currentPage,
              perPage: resultsThreshold,
            })

      // Check if the result is an error response
      if (
        !pageResults ||
        !pageResults.results ||
        !Array.isArray(pageResults.results)
      ) {
        logger.warn({
          msg: '[pappers] Invalid or error response from paginated search',
          event: 'paginated_search_invalid_response',
          metadata: {
            page: currentPage,
            query: searchParams.q,
            pageResults,
          },
        })
        break // Exit pagination loop on error
      }

      if (pageResults.results.length === 0) {
        break
      }

      // Use LLM to analyze this page
      const matchResult = await matchCompany(place, pageResults)

      logger.info({
        msg: '[pappers] Page analysis complete',
        event: 'paginated_search_page_analyzed',
        metadata: {
          page: currentPage,
          resultsInPage: pageResults.results.length,
          bestMatchConfidence: matchResult.bestMatch?.confidence || 0,
          query: searchParams.q,
        },
      })

      // Update best match if this page has a better one
      if (
        matchResult.bestMatch &&
        matchResult.bestMatch.confidence > bestConfidence
      ) {
        bestMatch = matchResult.bestMatch
        bestConfidence = matchResult.bestMatch.confidence
        bestAlternatives = matchResult.alternatives

        // If we found a high-confidence match, we can stop early
        if (bestConfidence >= 90) {
          logger.info({
            msg: '[pappers] High confidence match found, stopping pagination',
            event: 'paginated_search_high_confidence_found',
            metadata: {
              confidence: bestConfidence,
              page: currentPage,
              query: searchParams.q,
            },
          })
          break
        }
      }

      currentPage++
      searchedPages++

      // Don't continue if there are no more pages
      if (!pageResults.hasMoreResults) {
        break
      }
    }

    logger.info({
      msg: '[pappers] Paginated search completed',
      event: 'paginated_search_completed',
      metadata: {
        bestMatchConfidence: bestConfidence,
        pagesSearched: searchedPages,
        totalResults: firstPageResults.total,
        query: searchParams.q,
      },
    })

    // Track successful request
    metricsTimer.stop({ service: 'pappers', endpoint: 'enhanced_search' })
    externalApiRequestsCounter.inc({
      service: 'pappers',
      endpoint: 'enhanced_search',
      status_code: httpStatusCode,
    })

    return {
      bestMatch,
      alternatives: bestAlternatives,
      searchResults: firstPageResults, // Return first page for reference
      searchAttempts: searchedPages,
      totalResults: firstPageResults.total,
      pagesSearched: searchedPages,
    }
  } catch (error) {
    httpStatusCode = '500'
    metricsTimer.stop({ service: 'pappers', endpoint: 'enhanced_search' })
    externalApiRequestsCounter.inc({
      service: 'pappers',
      endpoint: 'enhanced_search',
      status_code: httpStatusCode,
    })

    logger.error({
      msg: '[pappers] Paginated search error',
      event: 'paginated_search_error',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        query: searchParams.q,
      },
    })
    throw error
  }
}

export const enhancedPappersSearch = async (
  place: Place,
  searchParams: InterantionalSearchV1,
  skipNameCleaning = false,
  maxPages = 5,
  resultsThreshold = 50,
) => {
  logger.info({
    msg: '[pappers] Starting enhanced Pappers search with pagination',
    event: 'enhanced_pappers_search_start',
    metadata: {
      placeName: place.name,
      countryCode: searchParams.countryCode,
      query: searchParams.q,
      maxPages,
      resultsThreshold,
    },
  })

  // Initial search with original query using pagination
  let searchResults = await paginatedSearch(
    place,
    searchParams,
    maxPages,
    resultsThreshold,
  )
  let totalSearchAttempts = searchResults.searchAttempts

  // If no results found and we're not skipping name cleaning, try cleaning the name
  if (!searchResults.bestMatch && !skipNameCleaning) {
    logger.info({
      msg: '[pappers] No results found with original name, attempting name cleaning',
      event: 'enhanced_pappers_search_zero_results_cleaning',
      metadata: { placeName: place.name, query: searchParams.q },
    })

    const cleanResult = await cleanCompanyName(
      searchParams.q,
      place.formatted_address || '',
    )

    logger.info({
      msg: '[pappers] Name cleaned for zero results',
      event: 'enhanced_pappers_search_name_cleaned_zero_results',
      metadata: {
        placeName: place.name,
        query: searchParams.q,
        cleaned: cleanResult.cleanedName,
        reasoning: cleanResult.reasoning,
      },
    })

    // Search again with cleaned name using pagination
    const cleanedSearchParams = {
      ...searchParams,
      q: cleanResult.cleanedName,
    }

    const cleanedSearchResults = await paginatedSearch(
      place,
      cleanedSearchParams,
      maxPages,
      resultsThreshold,
    )
    totalSearchAttempts += cleanedSearchResults.searchAttempts

    if (cleanedSearchResults.bestMatch) {
      searchResults = cleanedSearchResults
    }
  }

  // If still no good match found, and we haven't cleaned yet, try cleaning
  if (
    searchResults.bestMatch &&
    searchResults.bestMatch.confidence < 70 &&
    !skipNameCleaning &&
    totalSearchAttempts === searchResults.searchAttempts
  ) {
    logger.info({
      msg: '[pappers] Poor match found, attempting name cleaning',
      event: 'enhanced_pappers_search_cleaning_name',
      metadata: {
        placeName: place.name,
        query: searchParams.q,
        originalConfidence: searchResults.bestMatch.confidence,
      },
    })

    const cleanResult = await cleanCompanyName(
      searchParams.q,
      place.formatted_address || '',
    )

    logger.info({
      msg: '[pappers] Name cleaned for poor match',
      event: 'enhanced_pappers_search_name_cleaned_poor_match',
      metadata: {
        placeName: place.name,
        query: searchParams.q,
        cleaned: cleanResult.cleanedName,
        reasoning: cleanResult.reasoning,
      },
    })

    // Search again with cleaned name using pagination
    const cleanedSearchParams = {
      ...searchParams,
      q: cleanResult.cleanedName,
    }

    const cleanedSearchResults = await paginatedSearch(
      place,
      cleanedSearchParams,
      maxPages,
      resultsThreshold,
    )
    totalSearchAttempts += cleanedSearchResults.searchAttempts

    // Use cleaned results if they're better
    if (
      cleanedSearchResults.bestMatch &&
      (!searchResults.bestMatch ||
        cleanedSearchResults.bestMatch.confidence >
          searchResults.bestMatch.confidence)
    ) {
      searchResults = cleanedSearchResults
    }
  }

  logger.info({
    msg: '[pappers] Enhanced Pappers search with pagination completed',
    event: 'enhanced_pappers_search_completed',
    metadata: {
      placeName: place.name,
      query: searchParams.q,
      bestMatch: searchResults.bestMatch,
      confidence: searchResults.bestMatch?.confidence,
      totalResults: searchResults.totalResults,
      pagesSearched: searchResults.pagesSearched,
      totalSearchAttempts,
    },
  })

  return {
    bestMatch: searchResults.bestMatch,
    alternatives: searchResults.alternatives,
    searchResults: searchResults.searchResults,
    searchAttempts: totalSearchAttempts,
    totalResults: searchResults.totalResults,
    pagesSearched: searchResults.pagesSearched,
  }
}
