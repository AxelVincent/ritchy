import { listContentKeys } from '@/api/queries/lists/useListContent'
import { searchContentKeys } from '@/api/queries/search/useSearchContent'
import { useMapStore } from '@/components/map-display/store/useMapStore'
import { useApiMutation } from '@/hooks/useApi'

import type {
  GetSearchContentApiResponse,
  ListContentApiResponse,
  Place,
  Status,
  UpdateStatusApiResponse,
  UpdateStatusRequest,
} from '@ritchy/types'
import { useQueryClient } from '@tanstack/react-query'
import posthog from 'posthog-js'

// Extended request type
interface ExtendedUpdateStatusRequest extends UpdateStatusRequest {
  listId: string | null
  searchId: string | null
  [key: string]: unknown
}

export const useUpdatePlaceStatus = () => {
  const queryClient = useQueryClient()
  const updatePlaceStatus = useMapStore((state) => state.updatePlaceStatus)

  return useApiMutation<UpdateStatusApiResponse, ExtendedUpdateStatusRequest>(
    '/status/:placeId',
    {
      method: 'PUT',
      getEndpoint: ({ placeId }) => `/status/${placeId}`,
      onSuccess: async (_, { placeId, status, listId, searchId }) => {
        posthog.capture('change_place_status', {
          property: 'value',
          place_id: placeId,
          new_status: status,
          list_id: listId,
          search_id: searchId,
        })

        // Update the MapStore for immediate UI feedback
        updatePlaceStatus(placeId, status)

        const updatedStatus: Status = {
          status,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        // Update places data
        queryClient.setQueriesData<Place[] | undefined>(
          { queryKey: ['places'] },
          (oldData) => {
            if (!oldData) return oldData

            return oldData.map((place) => {
              if (place.id === placeId) {
                return {
                  ...place,
                  status: place.status
                    ? { ...place.status, status: updatedStatus.status }
                    : updatedStatus,
                }
              }
              return place
            })
          },
        )

        // If this change is related to a list, update the list content
        if (listId) {
          queryClient.setQueriesData<ListContentApiResponse | undefined>(
            { queryKey: listContentKeys.list(listId) },
            (oldData) => {
              if (!oldData || 'error' in oldData) return oldData

              return {
                ...oldData,
                items: oldData.items.map((place) => {
                  if (place.id === placeId) {
                    return {
                      ...place,
                      status: place.status
                        ? { ...place.status, status: updatedStatus.status }
                        : updatedStatus,
                    }
                  }
                  return place
                }),
              }
            },
          )

          // Invalidate the list query to ensure fresh data
          queryClient.invalidateQueries({
            queryKey: listContentKeys.list(listId),
          })
        }

        // If this change is related to a search, update the search content
        if (searchId) {
          queryClient.setQueriesData<GetSearchContentApiResponse | undefined>(
            { queryKey: searchContentKeys.search(searchId) },
            (oldData) => {
              if (!oldData) return oldData

              // If it's an error response
              if (!Array.isArray(oldData)) {
                if ('error' in oldData) return oldData
                return oldData
              }

              // It's an array of Place objects
              return oldData.map((place) => {
                if (place.id === placeId) {
                  return {
                    ...place,
                    status: place.status
                      ? { ...place.status, status: updatedStatus.status }
                      : updatedStatus,
                  }
                }
                return place
              })
            },
          )

          // Invalidate the search query to ensure fresh data
          queryClient.invalidateQueries({
            queryKey: searchContentKeys.search(searchId),
          })
        }

        // Invalidate queries that might contain this place
        queryClient.invalidateQueries({
          queryKey: ['place', placeId],
        })
        // Invalidate any list queries that might contain this place
        queryClient.invalidateQueries({
          queryKey: ['places'],
        })
      },
    },
  )
}
