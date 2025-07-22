import { logger } from '@ritchy/logger'
import { getPlaceDetailsV1 } from '../../external/google_maps/place_details_V1'

export const getPlaces = (userPlaceIds: string[]) =>
  Promise.all(
    userPlaceIds.map(async (userPlaceId) => {
      logger.info({
        msg: 'Getting place details',
        event: 'get_places',
        metadata: { userPlaceId }
      })
      const place = await getPlaceDetailsV1(userPlaceId)
      return {
        ...place,
        userPlaceId
      }
    })
  )
