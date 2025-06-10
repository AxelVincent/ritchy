import type { HubspotBase, PlaceCompanyMapping } from '../types'

export const createPlaceCompanyMapping = (
  placeIds: string[],
  companies: HubspotBase[],
): PlaceCompanyMapping[] => {
  return placeIds.map((placeId, index) => ({
    placeId,
    hubspotCompanyId: companies[index].id,
    placeName: companies[index].properties.name,
  }))
}
