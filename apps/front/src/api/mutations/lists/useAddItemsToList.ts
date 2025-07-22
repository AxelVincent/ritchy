import { useApiMutation } from '@/hooks/useApi'
import type {
  AddItemsToListApiResponse,
  AddItemsToListRequest
} from '@ritchy/types'
import { useQueryClient } from '@tanstack/react-query'

export const useAddItemsToList = () => {
  const queryClient = useQueryClient()

  return useApiMutation<AddItemsToListApiResponse, AddItemsToListRequest>(
    '/lists/:id/items',
    {
      getEndpoint: ({ id }) => `/lists/${id}/items`,
      onSuccess: (_, { id }) => {
        queryClient.invalidateQueries({
          queryKey: ['lists'],
          exact: true
        })
        queryClient.invalidateQueries({
          queryKey: ['listContent', id],
          exact: true
        })
        queryClient.invalidateQueries({
          queryKey: ['searchContent']
        })
      }
    }
  )
}
