import type { PlacesSearchResponse } from '@ritchy/types'
import { type UseQueryResult, useQuery } from '@tanstack/react-query'
import { mockData } from '../places/mock/mockData'

export const useCustomListContentQuery = (
  listId: string,
): UseQueryResult<PlacesSearchResponse> => {
  return useQuery({
    queryKey: ['customList', listId],
    queryFn: async () => {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Return random subset of mockData (between 3-12 places)
      const randomCount = Math.floor(Math.random() * 10) + 3
      const randomPlaces = [...mockData]
        .sort(() => Math.random() - 0.5)
        .slice(0, randomCount)

      return randomPlaces
    },
  })
}
