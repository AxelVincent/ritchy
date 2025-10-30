import { listContentKeys } from '@/api/queries/lists/useListContent'
import { placeContactsKeys } from '@/api/queries/places/contacts/usePlaceContacts'
import { searchContentKeys } from '@/api/queries/search/useSearchContent'
import { useApiMutation } from '@/hooks/useApi'
import type {
  DeleteContactPhoneApiResponse,
  DeleteContactPhoneRequest,
} from '@ritchy/types'
import { useQueryClient } from '@tanstack/react-query'

export const useDeleteContactPhone = () => {
  const queryClient = useQueryClient()

  return useApiMutation<
    DeleteContactPhoneApiResponse,
    DeleteContactPhoneRequest & { phoneId: string; placeId: string }
  >('/contacts/phone/:phoneId', {
    method: 'DELETE',
    getEndpoint: ({ phoneId }) => `/contacts/phone/${phoneId}`,
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
