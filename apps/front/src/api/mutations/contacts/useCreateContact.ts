import { placeContactsKeys } from '@/api/queries/places/contacts/usePlaceContacts'
import { userPlacesKeys } from '@/api/queries/user-places/useUserPlaces'
import { useApiMutation } from '@/hooks/useApi'
import type {
  CreateContactApiResponse,
  CreateContactRequest,
} from '@ritchy/types'
import { useQueryClient } from '@tanstack/react-query'

export const useCreateContact = () => {
  const queryClient = useQueryClient()

  return useApiMutation<CreateContactApiResponse, CreateContactRequest>(
    '/contacts',
    {
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
    },
  )
}
