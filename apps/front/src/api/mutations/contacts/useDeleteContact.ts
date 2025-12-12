import { placeContactsKeys } from '@/api/queries/places/contacts/usePlaceContacts'
import { userPlacesKeys } from '@/api/queries/user-places/useUserPlaces'
import { useApiMutation } from '@/hooks/useApi'
import type {
  DeleteContactApiResponse,
  DeleteContactRequest,
} from '@ritchy/types'
import { useQueryClient } from '@tanstack/react-query'

export const useDeleteContact = () => {
  const queryClient = useQueryClient()

  return useApiMutation<
    DeleteContactApiResponse,
    DeleteContactRequest & { contactId: string; placeId: string }
  >('/contacts/:contactId', {
    method: 'DELETE',
    getEndpoint: ({ contactId }) => `/contacts/${contactId}`,
    getBody: ({ placeId }) => ({ placeId }),
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
