// Cost constants for Google API calls (in USD)
export const COST_PER_PLACE_DETAILS_CALL = 0.04 // $0.04 per call
export const COST_PER_TEXT_SEARCH_CALL = 0.04 // $0.04 per call

/**
 * Calculate cost efficiency for search refresh vs individual place calls
 */
export function computeCostEfficiency(
  missingPlaceCount: number,
  estimatedApiCalls: number,
): {
  individualCallsCost: number
  searchRefreshCost: number
  isSearchMoreEfficient: boolean
} {
  const individualCallsCost = missingPlaceCount * COST_PER_PLACE_DETAILS_CALL
  const searchRefreshCost = estimatedApiCalls * COST_PER_TEXT_SEARCH_CALL

  return {
    individualCallsCost,
    searchRefreshCost,
    isSearchMoreEfficient: searchRefreshCost < individualCallsCost,
  }
}
