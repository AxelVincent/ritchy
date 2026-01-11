import { placeContactsKeys } from '@/api/queries/places/contacts/usePlaceContacts'
import { userPlacesKeys } from '@/api/queries/user-places/useUserPlaces'
import { useApiMutation } from '@/hooks/useApi'
import type {
  UpdateContactPhoneApiResponse,
  UpdateContactPhoneRequest,
} from '@api/routes_web/contacts/update-phone/contract'
import { useQueryClient } from '@tanstack/react-query'

export const useUpdateContactPhone = () => {
  const queryClient = useQueryClient()

  return useApiMutation<
    UpdateContactPhoneApiResponse,
    UpdateContactPhoneRequest & { phoneId: string; placeId: string }
  >('/contacts/phone/:phoneId', {
    method: 'PATCH',
    getEndpoint: ({ phoneId }) => `/contacts/phone/${phoneId}`,
    getBody: ({ contactId, isPrimary }) => ({ contactId, isPrimary }),
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
