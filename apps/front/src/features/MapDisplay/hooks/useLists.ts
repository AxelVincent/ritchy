import { useAddItemsToList } from '@/api/mutations/lists/useAddItemsToList'
import { useCreateList } from '@/api/mutations/lists/useCreateList'
import { useRemoveFromList } from '@/api/mutations/lists/useRemoveFromList'
import { useListsQuery } from '@/api/queries/lists/useLists'
import type {
  AddItemsToListRequest,
  RemoveItemsFromListRequest,
} from '@ritchy/types'

interface CreateListParams {
  name: string
  emoji: string
}

export function useLists() {
  const { data: lists = [] } = useListsQuery()
  const createList = useCreateList()
  const addItems = useAddItemsToList()
  const removeItems = useRemoveFromList()

  return {
    lists,
    addList: (params: CreateListParams) =>
      createList.mutateAsync(params).then((res) => res.id),
    addItemsToList: (params: AddItemsToListRequest) =>
      addItems.mutateAsync(params),
    removeItemsFromList: (params: RemoveItemsFromListRequest) =>
      removeItems.mutateAsync(params),
  }
}
