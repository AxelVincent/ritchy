import { placeContactsKeys } from '@/api/queries/places/contacts/usePlaceContacts'
import { userPlacesKeys } from '@/api/queries/user-places/useUserPlaces'
import { useApiMutation } from '@/hooks/useApi'
import type {
  AddContactPhoneApiResponse,
  AddContactPhoneRequest,
} from '@api/routes_web/contacts/add-phone/contract'
import { useQueryClient } from '@tanstack/react-query'

export const usePostContactPhone = () => {
  const queryClient = useQueryClient()

  return useApiMutation<
    AddContactPhoneApiResponse,
    AddContactPhoneRequest & { placeId: string }
  >('/contacts/phone', {
    method: 'POST',
    onSettled: (_, __, { placeId }) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: userPlacesKeys.all,
      })
      queryClient.invalidateQueries({
        queryKey: placeContactsKeys.place(placeId),
      })
    },
  })
}
