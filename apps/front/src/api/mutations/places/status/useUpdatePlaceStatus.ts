import { placeKeys } from '@/api/queries/places/usePlace'
import { userPlaceMarkersKeys } from '@/api/queries/user-places/useUserPlaceMarkers'
import { userPlacesKeys } from '@/api/queries/user-places/useUserPlaces'
import { useApiMutation, webApiClient } from '@/hooks/useApi'
import { useAuth } from '@clerk/clerk-react'
import type {
  GetPlaceApiResponse,
  GetUserPlacesApiResponse,
  UpdateStatusApiResponse,
  UpdateStatusRequest,
} from '@ritchy/types'
import { useQueryClient } from '@tanstack/react-query'

export const useUpdatePlaceStatus = () => {
  const queryClient = useQueryClient()
  const { getToken } = useAuth()

  return useApiMutation<
    UpdateStatusApiResponse,
    UpdateStatusRequest & { listId: string | null }
  >('/places/:userPlaceId/status', {
    method: 'PUT',
    getEndpoint: ({ userPlaceId }) => `/places/${userPlaceId}/status`,
    getBody: ({ status, listId }) => ({ status, listId }),
    onSuccess: async (_, { userPlaceId }) => {
      try {
        // Fetch fresh place data with updated status
        const token = await getToken()
        const placeData = await queryClient.fetchQuery<GetPlaceApiResponse>({
          queryKey: placeKeys.place(userPlaceId),
          queryFn: async () => {
            return webApiClient.fetchWithAuth<GetPlaceApiResponse>(
              `/places/${userPlaceId}`,
              { method: 'GET' },
              token,
            )
          },
          staleTime: 0,
        })

        if ('error' in placeData) {
          throw new Error('Failed to fetch updated place')
        }

        const updatedPlace = placeData.place

        // Update all user places queries (unified endpoint)
        queryClient.setQueriesData<GetUserPlacesApiResponse>(
          { queryKey: userPlacesKeys.all },
          (oldData) => {
            if (!oldData || 'error' in oldData) return oldData

            const placeIndex = oldData.items.findIndex(
              (p) => p.id === userPlaceId,
            )
            if (placeIndex === -1) return oldData

            const newItems = [...oldData.items]
            newItems[placeIndex] = updatedPlace

            return {
              ...oldData,
              items: newItems,
            }
          },
        )

        // Invalidate markers query so map updates with new status color
        queryClient.invalidateQueries({ queryKey: userPlaceMarkersKeys.all })
      } catch (error) {
        console.error(
          '[useUpdatePlaceStatus] Failed to update optimistically:',
          error,
        )
        // Fallback: invalidate queries
        queryClient.invalidateQueries({ queryKey: userPlacesKeys.all })
      }
    },
  })
}
