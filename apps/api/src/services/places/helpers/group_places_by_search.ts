/**
 * Group missing places by their search ID
 */
export function groupPlacesBySearch(
  missingPlaceIds: string[],
  searchIdMap: Map<string, string | null>,
): {
  missingPlacesBySearch: Map<string, string[]>
  missingPlacesWithoutSearch: string[]
} {
  const missingPlacesBySearch = new Map<string, string[]>()
  const missingPlacesWithoutSearch: string[] = []

  for (const placeId of missingPlaceIds) {
    const searchId = searchIdMap.get(placeId)
    if (searchId) {
      if (!missingPlacesBySearch.has(searchId)) {
        missingPlacesBySearch.set(searchId, [])
      }
      missingPlacesBySearch.get(searchId)?.push(placeId)
    } else {
      missingPlacesWithoutSearch.push(placeId)
    }
  }

  return { missingPlacesBySearch, missingPlacesWithoutSearch }
}
