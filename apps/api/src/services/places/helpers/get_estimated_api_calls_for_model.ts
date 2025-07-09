/**
 * Get estimated API calls for a search model
 */
export function getEstimatedApiCallsForModel(model: string): number {
  switch (model) {
    case 'ESSENTIALS':
      return 3 // ~60 results, ~3 API calls
    case 'NAVIGATOR':
      return 12 // ~240 results, ~12 API calls
    case 'EXPLORER':
      return 48 // ~960 results, ~48 API calls
    case 'PRO':
      return 192 // ~3840 results, ~192 API calls
    default:
      return 3
  }
}
