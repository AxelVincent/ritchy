import { placeContactsKeys } from '@/api/queries/places/contacts/usePlaceContacts'
import { userPlacesKeys } from '@/api/queries/user-places/useUserPlaces'
import { useApiMutation } from '@/hooks/useApi'
import type {
  UpdateContactEmailApiResponse,
  UpdateContactEmailRequest,
} from '@ritchy/types'
import { useQueryClient } from '@tanstack/react-query'

export const useUpdateContactEmail = () => {
  const queryClient = useQueryClient()

  return useApiMutation<
    UpdateContactEmailApiResponse,
    UpdateContactEmailRequest & { emailId: string; placeId: string }
  >('/contacts/email/:emailId', {
    method: 'PATCH',
    getEndpoint: ({ emailId }) => `/contacts/email/${emailId}`,
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
