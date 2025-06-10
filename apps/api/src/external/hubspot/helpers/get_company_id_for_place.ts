import type { PlaceCompanyMapping } from '../types'

export const getCompanyIdForPlace = (
  mappings: PlaceCompanyMapping[],
  placeId: string,
): string | undefined => {
  return mappings.find((m) => m.placeId === placeId)?.hubspotCompanyId
}
