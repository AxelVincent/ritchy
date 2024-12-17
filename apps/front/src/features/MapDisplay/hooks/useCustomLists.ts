import { useCustomListMutations } from '@/api/mutations/lists/useCustomListMutations'
import { useCustomListsQuery } from '@/api/queries/lists/useCustomLists'

interface CreateListParams {
  name: string
  emoji: string
}

export function useCustomLists() {
  const { data: lists = [] } = useCustomListsQuery()
  const { addList, addItemsToList } = useCustomListMutations()

  return {
    lists,
    addList: (params: CreateListParams) =>
      addList.mutateAsync(params).then((res) => res.id),
    addItemsToList: (listId: string, items: unknown[]) =>
      addItemsToList.mutateAsync({ listId, items }),
  }
}
