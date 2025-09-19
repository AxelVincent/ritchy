import { useApiMutation } from '@/hooks/useApi'
import type {
  AddItemFromGeocodeApiResponse,
  AddItemFromGeocodeRequestBody,
} from '@ritchy/types'
import { useQueryClient } from '@tanstack/react-query'

export const useAddItemFromGeocode = () => {
  const queryClient = useQueryClient()

  return useApiMutation<
    AddItemFromGeocodeApiResponse,
    AddItemFromGeocodeRequestBody
  >('/lists/add-item-from-geocode', {
    onSuccess: (_, { listId }) => {
      // Invalidate lists query to refresh item counts
      queryClient.invalidateQueries({
        queryKey: ['lists'],
        exact: true,
      })
      // Invalidate the specific list content
      queryClient.invalidateQueries({
        queryKey: ['listContent', listId],
        exact: true,
      })
      // Invalidate search content to refresh any search results
      queryClient.invalidateQueries({
        queryKey: ['searchContent'],
      })
    },
  })
}
