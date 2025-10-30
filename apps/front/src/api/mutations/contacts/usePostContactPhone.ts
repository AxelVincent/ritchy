import { listContentKeys } from '@/api/queries/lists/useListContent'
import { placeContactsKeys } from '@/api/queries/places/contacts/usePlaceContacts'
import { searchContentKeys } from '@/api/queries/search/useSearchContent'
import { useApiMutation } from '@/hooks/useApi'
import type {
  PostContactPhoneApiResponse,
  PostContactPhoneRequest,
} from '@ritchy/types'
import { useQueryClient } from '@tanstack/react-query'

export const usePostContactPhone = () => {
  const queryClient = useQueryClient()

  return useApiMutation<
    PostContactPhoneApiResponse,
    PostContactPhoneRequest & { placeId: string }
  >('/contacts/phone', {
    method: 'POST',
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
