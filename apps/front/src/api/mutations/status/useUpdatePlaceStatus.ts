import { useMapStore } from '@/components/map-display/store/useMapStore'
import { useApiMutation } from '@/hooks/useApi'

import type {
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
      onSuccess: async (_, { placeId, status }) => {
        posthog.capture('change_place_status', {
          property: 'value',
          place_id: placeId,
          new_status: status,
        })

        // Update the MapStore for immediate UI feedback
        updatePlaceStatus(placeId, status)

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
