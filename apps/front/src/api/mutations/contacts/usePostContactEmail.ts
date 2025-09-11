import { listContentKeys } from '@/api/queries/lists/useListContent'
import { searchContentKeys } from '@/api/queries/search/useSearchContent'
import { useApiMutation } from '@/hooks/useApi'
import type {
  PostContactEmailApiResponse,
  PostContactEmailRequest,
} from '@ritchy/types'
import { useQueryClient } from '@tanstack/react-query'

export const usePostContactEmail = () => {
  const queryClient = useQueryClient()

  return useApiMutation<PostContactEmailApiResponse, PostContactEmailRequest>(
    '/contacts/email',
    {
      method: 'POST',
      onSettled: () => {
        // Invalidate and refetch
        queryClient.invalidateQueries({
          queryKey: searchContentKeys.all,
        })
        queryClient.invalidateQueries({
          queryKey: listContentKeys.all,
        })
      },
    },
  )
}
