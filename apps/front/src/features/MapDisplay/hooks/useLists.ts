import { useAddItemsToList } from '@/api/mutations/lists/useAddItemsToList'
import { useCreateList } from '@/api/mutations/lists/useCreateList'
import { useDeleteItemsFromList } from '@/api/mutations/lists/useDeleteItemsFromList'
import { useListsQuery } from '@/api/queries/lists/useLists'
import type {
  AddItemsToListRequest,
  DeleteItemsFromListRequest,
} from '@ritchy/types'

interface CreateListParams {
  name: string
  emoji: string
}

export function useLists() {
  const { data: lists = [] } = useListsQuery()
  const createList = useCreateList()
  const addItems = useAddItemsToList()
  const deleteItems = useDeleteItemsFromList()

  return {
    lists,
    addList: (params: CreateListParams) =>
      createList.mutateAsync(params).then((res) => res.id),
    addItemsToList: (params: AddItemsToListRequest) =>
      addItems.mutateAsync(params),
    deleteItemsFromList: (params: DeleteItemsFromListRequest) =>
      deleteItems.mutateAsync(params),
  }
}
