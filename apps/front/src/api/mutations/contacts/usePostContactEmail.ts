import { placeContactsKeys } from '@/api/queries/places/contacts/usePlaceContacts'
import { userPlacesKeys } from '@/api/queries/user-places/useUserPlaces'
import { useApiMutation } from '@/hooks/useApi'
import type {
  AddContactEmailApiResponse,
  AddContactEmailRequest,
} from '@api/routes_web/contacts/add-email/contract'
import { useQueryClient } from '@tanstack/react-query'

export const usePostContactEmail = () => {
  const queryClient = useQueryClient()

  return useApiMutation<
    AddContactEmailApiResponse,
    AddContactEmailRequest & { placeId: string }
  >('/contacts/email', {
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
