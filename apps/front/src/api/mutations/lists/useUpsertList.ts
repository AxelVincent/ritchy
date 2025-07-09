import { placesKeys } from '@/api/queries/places/usePlaces'
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
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['lists'] })
      return { previousLists: queryClient.getQueryData(['lists']) }
    },
    onError: (_error, _variables, context: unknown) => {
      const typedContext = context as Context
      if (typedContext?.previousLists) {
        queryClient.setQueryData(['lists'], typedContext.previousLists)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] })
      queryClient.invalidateQueries({ queryKey: placesKeys.all })
    },
  })
}
