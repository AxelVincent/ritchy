import { getPlaceDetailsV1 } from '../../external/google_maps/place_details_V1'

export const getPlaces = (placeIds: string[]) =>
  Promise.all(placeIds.map((placeId) => getPlaceDetailsV1(placeId)))
