import { listContentKeys } from '@/api/queries/lists/useListContent'
import { placeContactsKeys } from '@/api/queries/places/contacts/usePlaceContacts'
import { searchContentKeys } from '@/api/queries/search/useSearchContent'
import { useApiMutation } from '@/hooks/useApi'
import type {
  DeleteContactEmailApiResponse,
  DeleteContactEmailRequest,
} from '@ritchy/types'
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
