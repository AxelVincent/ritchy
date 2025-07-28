import { useApiQuery } from '@/hooks/useApi'
import type { GetReviewsApiResponse } from '@ritchy/types'

const reviewsKeys = {
  place: (placeSourceId: string) =>
    ['reviews', 'place', placeSourceId] as const,
}

export const usePlaceReviewsQuery = (placeSourceId: string) => {
  return useApiQuery<GetReviewsApiResponse>(
    `/places/${placeSourceId}/reviews`,
    reviewsKeys.place(placeSourceId),
  )
}
