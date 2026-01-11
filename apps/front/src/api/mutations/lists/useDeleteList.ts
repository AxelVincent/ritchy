import { useApiMutation } from '@/hooks/useApi'
import type {
  DeleteListApiResponse,
  DeleteListRequestParams,
} from '@api/routes_web/lists/delete/contract'
import { useQueryClient } from '@tanstack/react-query'

export const useDeleteList = () => {
  const queryClient = useQueryClient()

  return useApiMutation<DeleteListApiResponse, DeleteListRequestParams>(
    '/lists/:id',
    {
      method: 'DELETE',
      getEndpoint: ({ id }) => `/lists/${id}`,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['lists'] })
      },
    },
  )
}
