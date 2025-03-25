import { useApiMutation } from '@/hooks/useApi'
import type {
  UpdateStatusApiResponse,
  UpdateStatusRequest,
} from '@ritchy/types'
import { useQueryClient } from '@tanstack/react-query'

export const useUpdatePlaceStatus = () => {
  const queryClient = useQueryClient()

  return useApiMutation<UpdateStatusApiResponse, UpdateStatusRequest>(
    '/places/:placeId/status',
    {
      method: 'PUT',
      getEndpoint: ({ placeId }) => `/places/${placeId}/status`,
      getBody: ({ status }) => ({ status }),
      onSuccess: (_, { placeId }) => {
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
