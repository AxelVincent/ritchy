import { useApiMutation } from '@/hooks/useApi'
import type {
  AddItemsApiResponse,
  AddItemsRequestBody,
  AddItemsRequestParams,
} from '@api/routes_web/lists/add-items/contract'
import { useQueryClient } from '@tanstack/react-query'

export const useAddItemsToList = () => {
  const queryClient = useQueryClient()

  return useApiMutation<
    AddItemsApiResponse,
    AddItemsRequestBody & AddItemsRequestParams
  >('/lists/:id/items', {
    getEndpoint: ({ id }) => `/lists/${id}/items`,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['lists'],
        exact: true,
      })
      queryClient.invalidateQueries({
        queryKey: ['searchContent'],
      })
    },
  })
}
