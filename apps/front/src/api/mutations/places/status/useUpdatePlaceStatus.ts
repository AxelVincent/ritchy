import { placesKeys } from '@/api/queries/places/usePlaces'
import { useApiMutation } from '@/hooks/useApi'
import type {
  Place,
  PostGetPlacesApiResponse,
  UpdateStatusApiResponse,
  UpdateStatusRequest,
} from '@ritchy/types'
import { useQueryClient } from '@tanstack/react-query'

export const useUpdatePlaceStatus = () => {
  const queryClient = useQueryClient()

  return useApiMutation<
    UpdateStatusApiResponse,
    UpdateStatusRequest & { searchId: string | null; listId: string | null }
  >('/places/:placeId/status', {
    method: 'PUT',
    getEndpoint: ({ placeId }) => `/places/${placeId}/status`,
    getBody: ({ status, searchId, listId }) => ({ status, searchId, listId }),
    onMutate: async ({ placeId, searchId, status, listId }) => {
      // Determine which ID to use based on current view
      const currentId = listId || searchId
      const idType = listId ? 'listId' : 'searchId'
      const filters = { [idType]: currentId }

      const queryKey = [...placesKeys.all, 'filters', JSON.stringify(filters)]

      await queryClient.cancelQueries({ queryKey })
      const previousData = queryClient.getQueryData<Place[]>(queryKey)

      // Optimistically update
      if (previousData) {
        queryClient.setQueryData<Place[]>(queryKey, (oldData) => {
          return (
            oldData?.map((place) => {
              if (place.id === placeId) {
                return {
                  ...place,
                  status: {
                    status,
                    updatedAt: new Date().toISOString(),
                    createdAt:
                      place.status?.createdAt ?? new Date().toISOString(),
                  },
                }
              }
              return place
            }) ?? []
          )
        })
      }

      return { previousData, queryKey }
    },
    onError: (_, _variables, context: unknown) => {
      const typedContext = context as {
        previousData?: PostGetPlacesApiResponse
        queryKey: readonly unknown[]
      }
      // Roll back to the previous value
      if (typedContext?.previousData) {
        queryClient.setQueryData(
          typedContext.queryKey,
          typedContext.previousData,
        )
      }
    },
  })
}
