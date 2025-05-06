import { useApiMutation } from '@/hooks/useApi'
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
        if (newList.id) {
          return old?.map((list) => {
            if (list.id === newList.id) {
              return {
                ...list,
                name: newList.name,
                emoji: newList.emoji,
              }
            }
            return list
          })
        }
        return [
          ...(old || []),
          {
            ...newList,
            id: `temp-${Date.now()}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            itemCount: 0,
          },
        ]
      })
      return { previousLists }
    },
    onError: (_, __, context: unknown) => {
      const typedContext = context as Context
      queryClient.setQueryData<Lists>(['lists'], typedContext?.previousLists)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] })
    },
  })
}
