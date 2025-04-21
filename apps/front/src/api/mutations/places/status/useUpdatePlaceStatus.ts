import { listContentKeys } from '@/api/queries/lists/useListContent'
import { searchContentKeys } from '@/api/queries/search/useSearchContent'
import { useApiMutation } from '@/hooks/useApi'
import type {
  GetListContentResponse,
  GetSearchContentResponse,
  UpdateStatusApiResponse,
  UpdateStatusRequest,
} from '@ritchy/types'
import { useQueryClient } from '@tanstack/react-query'

export const useUpdatePlaceStatus = () => {
  const queryClient = useQueryClient()

  return useApiMutation<
    UpdateStatusApiResponse,
    UpdateStatusRequest & { searchId: string | null; listId: string | null }
  >('/places/:placeId/status', {
    method: 'PUT',
    getEndpoint: ({ placeId }) => `/places/${placeId}/status`,
    getBody: ({ status, searchId, listId }) => ({ status, searchId, listId }),
    onMutate: async ({ placeId, searchId, status, listId }) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({
        queryKey: searchId ? searchContentKeys.search(searchId) : undefined,
      })
      await queryClient.cancelQueries({
        queryKey: listId ? listContentKeys.list(listId) : undefined,
      })

      // Snapshot the previous value
      const previousSearch = searchId
        ? queryClient.getQueryData(searchContentKeys.search(searchId))
        : undefined
      const previousList = listId
        ? queryClient.getQueryData(listContentKeys.list(listId))
        : undefined

      // Optimistically update the search results
      if (previousSearch && searchId) {
        queryClient.setQueryData(
          searchContentKeys.search(searchId),
          (oldData: GetSearchContentResponse) => {
            return oldData.map((place) => {
              if (place.id === placeId) {
                return {
                  ...place,
                  status: {
                    ...place.status,
                    status,
                    updatedAt: new Date().toISOString(),
                  },
                }
              }
              return place
            })
          },
        )
      }

      // Optimistically update the list
      if (previousList && listId) {
        queryClient.setQueryData(
          listContentKeys.list(listId),
          (oldData: GetListContentResponse) => {
            return {
              ...oldData,
              items: oldData.items.map((place) => {
                if (place.id === placeId) {
                  return {
                    ...place,
                    status: {
                      ...place.status,
                      status,
                      updatedAt: new Date().toISOString(),
                    },
                  }
                }
                return place
              }),
            }
          },
        )
      }

      // Return a context object with the snapshotted values
      return { previousSearch, previousList, searchId, listId }
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
          typedContext.previousSearch,
        )
      }
      if (typedContext?.listId) {
        queryClient.setQueryData(
          listContentKeys.list(typedContext.listId),
          typedContext.previousList,
        )
      }
    },
  })
}
