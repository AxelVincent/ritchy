import { listContentKeys } from '@/api/queries/lists/useListContent'
import { searchContentKeys } from '@/api/queries/search/useSearchContent'
import { useApiMutation } from '@/hooks/useApi'
import type {
  GetListContentResponse,
  GetSearchContentResponse,
  UpdateStatusApiResponse,
  UpdateStatusRequest
} from '@ritchy/types'
import { useQueryClient } from '@tanstack/react-query'

export const useUpdatePlaceStatus = () => {
  const queryClient = useQueryClient()

  return useApiMutation<
    UpdateStatusApiResponse,
    UpdateStatusRequest & { listId: string | null }
  >('/places/:userPlaceId/status', {
    method: 'PUT',
    getEndpoint: ({ userPlaceId }) => `/places/${userPlaceId}/status`,
    getBody: ({ status, listId }) => ({ status, listId }),
    onMutate: async ({ listId }) => {
      queryClient.invalidateQueries({
        queryKey: listContentKeys.all
      })

      queryClient.invalidateQueries({
        queryKey: searchContentKeys.all
      })

      // Return a context object with the snapshotted values
      return { listId }
    },
    onError: (_, _variables, context: unknown) => {
      const typedContext = context as {
        previousSearch?: GetSearchContentResponse
        previousList?: GetListContentResponse
        searchId?: string
        listId?: string
      }
      // If the mutation fails, roll back to the previous values
      if (typedContext?.searchId) {
        queryClient.setQueryData(
          searchContentKeys.search(typedContext.searchId),
          typedContext.previousSearch
        )
      }
      if (typedContext?.listId) {
        queryClient.setQueryData(
          listContentKeys.list(typedContext.listId),
          typedContext.previousList
        )
      }
    }
  })
}
