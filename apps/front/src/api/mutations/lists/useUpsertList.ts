import { useApiMutation } from '@/hooks/useApi'
import { listContentKeys } from '@/api/queries/lists/useListContent'
import { searchContentKeys } from '@/api/queries/search/useSearchContent'
import type {
  Lists,
  UpsertListRequest,
  UpsertListResponse,
} from '@ritchy/types'
import { useQueryClient } from '@tanstack/react-query'

type Context = {
  previousLists: Lists | undefined
}

export const useUpsertList = () => {
  const queryClient = useQueryClient()

  return useApiMutation<UpsertListResponse, UpsertListRequest>('/lists', {
    onMutate: async (newList) => {
      await queryClient.cancelQueries({ queryKey: ['lists'] })
      const previousLists = queryClient.getQueryData<Lists>(['lists'])

      queryClient.setQueryData<Lists>(['lists'], (old) => {
        if (!old) return old
        const updatedLists = old.map((list) =>
          list.id === newList.id ? { ...list, ...newList } : list,
        )
        return updatedLists
      })

      if (newList.id) {
        const listContentQueries = queryClient.getQueryCache().findAll({
          queryKey: listContentKeys.all,
        })
        for (const query of listContentQueries) {
          const listContent = query.state.data as {
            items: Array<{ lists?: Array<{ id: string; emoji: string }> }>
          }
          if (listContent?.items) {
            queryClient.setQueryData(query.queryKey, {
              ...listContent,
              items: listContent.items.map((place) => {
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
            })
          }
        }
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
          queryKey: listContentKeys.list(data.id),
        })
        queryClient.invalidateQueries({
          queryKey: searchContentKeys.all,
        })
      }
    },
  })
}
