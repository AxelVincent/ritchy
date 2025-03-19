import { useMapStore } from '@/components/map-display/store/useMapStore'
import { useApiMutation } from '@/hooks/useApi'
import type {
  Place,
  Status,
  UpdateStatusApiResponse,
  UpdateStatusRequest,
} from '@ritchy/types'
import { useQueryClient } from '@tanstack/react-query'
import posthog from 'posthog-js'

export const useUpdatePlaceStatus = () => {
  const queryClient = useQueryClient()
  const updatePlaceStatus = useMapStore((state) => state.updatePlaceStatus)

  return useApiMutation<UpdateStatusApiResponse, UpdateStatusRequest>(
    '/status/:placeId',
    {
      method: 'PUT',
      getEndpoint: ({ placeId }) => `/status/${placeId}`,
      onMutate: async (variables) => {
        const { placeId, status } = variables
        posthog.capture('change_place_status', {
          property: 'value',
          place_id: placeId,
          new_status: status,
        })

        // 1. Update the MapStore for immediate UI feedback
        updatePlaceStatus(placeId, status)

        // 2. Cancel any outgoing refetches
        await queryClient.cancelQueries({ queryKey: ['places'] })
        await queryClient.cancelQueries({ queryKey: ['place', placeId] })
        await queryClient.cancelQueries({ queryKey: ['searchContent'] })
        await queryClient.cancelQueries({ queryKey: ['listContent'] })

        // 3. Create a status object with required fields
        const updatedStatus: Status = {
          status,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        // 4. Update places data
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

        // 5. Update searchContent data with specific searchIds
        const searchQueries = queryClient.getQueriesData<Place[]>({
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            query.queryKey[0] === 'searchContent',
        })

        for (const [queryKey, queryData] of searchQueries) {
          if (queryData) {
            queryClient.setQueryData<Place[]>(
              queryKey,
              queryData.map((place) => {
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
            )
          }
        }

        // 6. Update listContent data with specific listIds
        const listQueries = queryClient.getQueriesData<Place[]>({
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            query.queryKey[0] === 'listContent',
        })

        for (const [queryKey, queryData] of listQueries) {
          if (queryData) {
            queryClient.setQueryData<Place[]>(
              queryKey,
              queryData.map((place) => {
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
            )
          }
        }

        // 7. Update individual place data
        queryClient.setQueryData<Place | undefined>(
          ['place', placeId],
          (oldPlace) => {
            if (!oldPlace) return oldPlace
            return {
              ...oldPlace,
              status: oldPlace.status
                ? { ...oldPlace.status, status: updatedStatus.status }
                : updatedStatus,
            }
          },
        )
      },
      onSuccess: (_, { placeId }) => {
        // Invalidate to ensure latest data
        queryClient.invalidateQueries({
          queryKey: ['place', placeId],
        })
        queryClient.invalidateQueries({
          queryKey: ['places'],
        })
        // Invalidate all searchContent queries
        queryClient.invalidateQueries({
          queryKey: ['searchContent'],
        })
        // Invalidate all listContent queries
        queryClient.invalidateQueries({
          queryKey: ['listContent'],
        })
      },
    },
  )
}
