import { useApiMutation } from '@/hooks/useApi'
import type {
  DeleteItemsFromListApiResponse,
  DeleteItemsFromListRequest,
} from '@ritchy/types'
import { useQueryClient } from '@tanstack/react-query'

export const useDeleteItemsFromList = () => {
  const queryClient = useQueryClient()

  return useApiMutation<
    DeleteItemsFromListApiResponse,
    DeleteItemsFromListRequest
  >('/lists/:id/items', {
    method: 'DELETE',
    getEndpoint: ({ id }) => `/lists/${id}/items`,
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({
        queryKey: ['lists'],
        exact: true,
      })
      queryClient.invalidateQueries({
        queryKey: ['listContent', id],
        exact: true,
      })
    },
  })
}
