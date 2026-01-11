import { useApiMutation } from '@/hooks/useApi'
import type {
  AddItemFromGeocodeApiResponse,
  AddItemFromGeocodeRequestBody,
} from '@api/routes_web/lists/add-item-from-geocode/contract'
import { useQueryClient } from '@tanstack/react-query'

export const useAddItemFromGeocode = () => {
  const queryClient = useQueryClient()

  return useApiMutation<
    AddItemFromGeocodeApiResponse,
    AddItemFromGeocodeRequestBody
  >('/lists/add-item-from-geocode', {
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
