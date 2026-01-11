import { placeContactsKeys } from '@/api/queries/places/contacts/usePlaceContacts'
import { userPlacesKeys } from '@/api/queries/user-places/useUserPlaces'
import { useApiMutation } from '@/hooks/useApi'
import type {
  UpdateContactApiResponse,
  UpdateContactRequest,
} from '@api/routes_web/contacts/update/contract'
import { useQueryClient } from '@tanstack/react-query'

export const useUpdateContact = () => {
  const queryClient = useQueryClient()

  return useApiMutation<
    UpdateContactApiResponse,
    UpdateContactRequest & { contactId: string; placeId: string }
  >('/contacts/:contactId', {
    method: 'PATCH',
    getEndpoint: ({ contactId }) => `/contacts/${contactId}`,
    getBody: ({ isPrimary }) => ({ isPrimary }),
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
