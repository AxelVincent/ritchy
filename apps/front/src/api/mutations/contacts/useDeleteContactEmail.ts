import { placeContactsKeys } from '@/api/queries/places/contacts/usePlaceContacts'
import { userPlacesKeys } from '@/api/queries/user-places/useUserPlaces'
import { useApiMutation } from '@/hooks/useApi'
import type {
  DeleteContactEmailApiResponse,
  DeleteContactEmailRequest,
} from '@api/routes_web/contacts/delete-email/contract'
import { useQueryClient } from '@tanstack/react-query'

export const useDeleteContactEmail = () => {
  const queryClient = useQueryClient()

  return useApiMutation<
    DeleteContactEmailApiResponse,
    DeleteContactEmailRequest & { emailId: string; placeId: string }
  >('/contacts/email/:emailId', {
    method: 'DELETE',
    getEndpoint: ({ emailId }) => `/contacts/email/${emailId}`,
    getBody: ({ contactId }) => ({ contactId }),
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
