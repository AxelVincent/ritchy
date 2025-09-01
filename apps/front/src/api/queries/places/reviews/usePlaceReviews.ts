import { useApiQuery } from '@/hooks/useApi'
import type { GetReviewsApiResponse } from '@ritchy/types'

const reviewsKeys = {
  place: (userPlaceId: string) => ['reviews', 'place', userPlaceId] as const,
}

export const usePlaceReviewsQuery = (userPlaceId: string) => {
  return useApiQuery<GetReviewsApiResponse>(
    `/places/${userPlaceId}/reviews`,
    reviewsKeys.place(userPlaceId),
  )
}
