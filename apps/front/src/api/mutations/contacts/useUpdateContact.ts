import { listContentKeys } from '@/api/queries/lists/useListContent'
import { placeContactsKeys } from '@/api/queries/places/contacts/usePlaceContacts'
import { searchContentKeys } from '@/api/queries/search/useSearchContent'
import { useApiMutation } from '@/hooks/useApi'
import type {
  UpdateContactApiResponse,
  UpdateContactRequest,
} from '@ritchy/types'
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
        queryKey: searchContentKeys.all,
      })
      queryClient.invalidateQueries({
        queryKey: listContentKeys.all,
      })
      queryClient.invalidateQueries({
        queryKey: placeContactsKeys.place(placeId),
      })
    },
  })
}
