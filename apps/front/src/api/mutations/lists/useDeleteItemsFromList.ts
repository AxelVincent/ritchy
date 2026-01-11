import { userPlaceFilterOptionsKeys } from '@/api/queries/user-places/useUserPlaceFilterOptions'
import { userPlaceMarkersKeys } from '@/api/queries/user-places/useUserPlaceMarkers'
import { userPlacesKeys } from '@/api/queries/user-places/useUserPlaces'
import { useApiMutation } from '@/hooks/useApi'
import type {
  DeleteItemsApiResponse,
  DeleteItemsRequestBody,
  DeleteItemsRequestParams,
} from '@api/routes_web/lists/delete-items/contract'
import { useQueryClient } from '@tanstack/react-query'

export const useDeleteItemsFromList = () => {
  const queryClient = useQueryClient()

  return useApiMutation<
    DeleteItemsApiResponse,
    DeleteItemsRequestBody & DeleteItemsRequestParams
  >('/lists/:id/items', {
    method: 'DELETE',
    getEndpoint: ({ id }) => `/lists/${id}/items`,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['lists'],
        exact: true,
      })
      queryClient.invalidateQueries({ queryKey: userPlacesKeys.all })
      queryClient.invalidateQueries({ queryKey: userPlaceMarkersKeys.all })
      queryClient.invalidateQueries({
        queryKey: userPlaceFilterOptionsKeys.all,
      })
    },
  })
}
