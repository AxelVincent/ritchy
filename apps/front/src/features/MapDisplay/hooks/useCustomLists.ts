import { useAddItemsToList } from '@/api/mutations/lists/useAddItemsToList'
import { useCreateList } from '@/api/mutations/lists/useCreateList'
import { useRemoveFromList } from '@/api/mutations/lists/useRemoveFromList'
import { useCustomListsQuery } from '@/api/queries/lists/useCustomLists'

interface CreateListParams {
  name: string
  emoji: string
}

export function useCustomLists() {
  const { data: lists = [] } = useCustomListsQuery()
  const createList = useCreateList()
  const addItems = useAddItemsToList()
  const removeItems = useRemoveFromList()

  return {
    lists,
    addList: (params: CreateListParams) =>
      createList.mutateAsync(params).then((res) => res.id),
    addItemsToList: (listId: string, items: unknown[]) =>
      addItems.mutateAsync({ listId, items }),
    removeItemsFromList: (listId: string, items: unknown[]) =>
      removeItems.mutateAsync({ listId, items }),
  }
}
