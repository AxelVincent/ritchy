import { useApiQuery } from '@/hooks/useApi'
import type { GetReviewsApiResponse } from '@ritchy/types'

const reviewsKeys = {
  place: (placeId: string) => ['reviews', 'place', placeId] as const,
}

export const usePlaceReviewsQuery = (placeId: string) => {
  return useApiQuery<GetReviewsApiResponse>(
    `/places/${placeId}/reviews`,
    reviewsKeys.place(placeId),
  )
}
