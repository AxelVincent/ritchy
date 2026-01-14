import { userPlacesKeys } from '@/api/queries/user-places/useUserPlaces'
import { useApiMutation } from '@/hooks/useApi'
import type {
  CreateListRequest,
  CreateListResponse,
} from '@api/routes_web/lists/create/contract'
import type { ListsResponse } from '@api/routes_web/lists/list/contract'
import type { GetUserPlacesApiResponse } from '@api/routes_web/user-places/get/contract'
import { useQueryClient } from '@tanstack/react-query'

type Context = {
  previousLists: ListsResponse | undefined
}

export const useUpsertList = () => {
  const queryClient = useQueryClient()

  return useApiMutation<CreateListResponse, CreateListRequest>('/lists', {
    onMutate: async (newList) => {
      await queryClient.cancelQueries({ queryKey: ['lists'] })
      const previousLists = queryClient.getQueryData<ListsResponse>(['lists'])

      queryClient.setQueryData<ListsResponse>(['lists'], (old) => {
        if (!old) return old
        const updatedLists = old.map((list) =>
          list.id === newList.id ? { ...list, ...newList } : list,
        )
        return updatedLists
      })

      if (newList.id) {
        // Update user places queries to reflect emoji changes
        queryClient.setQueriesData<GetUserPlacesApiResponse>(
          { queryKey: userPlacesKeys.all },
          (oldData) => {
            if (!oldData || 'error' in oldData) return oldData

            return {
              ...oldData,
              items: oldData.items.map((place) => {
                if (!place.lists) return place
                const updatedList = place.lists.find(
                  (list) => list.id === newList.id,
                )
                if (!updatedList) return place
                const otherLists = place.lists.filter(
                  (list) => list.id !== newList.id,
                )
                return {
                  ...place,
                  lists: [
                    { ...updatedList, emoji: newList.emoji },
                    ...otherLists,
                  ],
                }
              }),
            }
          },
        )
      }

      return { previousLists }
    },
    onError: (_error, _variables, context: unknown) => {
      const typedContext = context as Context
      if (typedContext?.previousLists) {
        queryClient.setQueryData(['lists'], typedContext.previousLists)
      }
    },
    onSettled: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lists'] })
      if (data?.id) {
        queryClient.invalidateQueries({
          queryKey: userPlacesKeys.all,
        })
      }
    },
  })
}
