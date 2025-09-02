import { listContentKeys } from '@/api/queries/lists/useListContent'
import { searchContentKeys } from '@/api/queries/search/useSearchContent'
import { useApiMutation } from '@/hooks/useApi'
import type {
  PostContactEmailApiResponse,
  PostContactEmailRequest,
  SearchResult,
} from '@ritchy/types'
import type {
  GetListContentApiResponse,
  GetSearchContentApiResponse,
} from '@ritchy/types'
import { useQueryClient } from '@tanstack/react-query'

export const usePostContactEmail = () => {
  const queryClient = useQueryClient()

  return useApiMutation<PostContactEmailApiResponse, PostContactEmailRequest>(
    '/contacts/email',
    {
      method: 'POST',
      onMutate: async ({ userPlaceId, email }) => {
        // Cancel any outgoing refetches
        const searchQueries =
          queryClient.getQueriesData<GetSearchContentApiResponse>({
            queryKey: searchContentKeys.all,
          })

        // Cancel and update each active search query
        await Promise.all(
          searchQueries.map(([queryKey]) =>
            queryClient.cancelQueries({ queryKey }),
          ),
        )

        // Update each search query
        for (const [queryKey, oldData] of searchQueries) {
          if (Array.isArray(oldData)) {
            // Check if it's the success case (array of places)
            queryClient.setQueryData(
              queryKey,
              oldData.map((place) => {
                if (place.id === userPlaceId) {
                  return {
                    ...place,
                    emails: [
                      ...(place.contactEmails || []),
                      {
                        id: `temp-${Date.now()}`,
                        email,
                        contactId: place.id,
                        isPrimary: false,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                      },
                    ],
                  }
                }
                return place
              }),
            )
          }
        }

        // Do the same for list queries
        const listQueries =
          queryClient.getQueriesData<GetListContentApiResponse>({
            queryKey: listContentKeys.all,
          })

        await Promise.all(
          listQueries.map(([queryKey]) =>
            queryClient.cancelQueries({ queryKey }),
          ),
        )

        for (const [queryKey, oldData] of listQueries) {
          if (oldData && 'items' in oldData) {
            queryClient.setQueryData(queryKey, {
              ...oldData,
              items: oldData.items.map((place: SearchResult) => {
                if (place.id === userPlaceId) {
                  return {
                    ...place,
                    emails: [
                      ...(place.contactEmails || []),
                      {
                        id: `temp-${Date.now()}`,
                        email,
                        contactId: place.id,
                        isPrimary: false,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                      },
                    ],
                  }
                }
                return place
              }),
            })
          }
        }

        return { searchQueries, listQueries }
      },
      onError: (_, __, context: unknown) => {
        const typedContext = context as {
          previousSearch: SearchResult[]
          previousList: SearchResult[]
        }
        if (typedContext?.previousSearch) {
          queryClient.setQueriesData(
            { queryKey: searchContentKeys.all },
            typedContext.previousSearch,
          )
        }
        if (typedContext?.previousList) {
          queryClient.setQueriesData(
            { queryKey: listContentKeys.all },
            typedContext.previousList,
          )
        }
      },
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
