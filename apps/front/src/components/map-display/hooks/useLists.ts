import { useAddItemsToList } from '@/api/mutations/lists/useAddItemsToList'
import { useDeleteItemsFromList } from '@/api/mutations/lists/useDeleteItemsFromList'
import { useUpsertList } from '@/api/mutations/lists/useUpsertList'
import { useListsQuery } from '@/api/queries/lists/useLists'
import type {
  AddItemsToListRequest,
  DeleteItemsFromListRequest,
} from '@ritchy/types'

interface UpsertListParams {
  name: string
  emoji: string
}

export function useLists() {
  const { data: lists = [] } = useListsQuery()
  const upsertList = useUpsertList()
  const addItems = useAddItemsToList()
  const deleteItems = useDeleteItemsFromList()

  return {
    lists,
    addList: (params: UpsertListParams) =>
      upsertList.mutateAsync(params).then((res) => res.id),
    addItemsToList: (params: AddItemsToListRequest) =>
      addItems.mutateAsync(params),
    deleteItemsFromList: (params: DeleteItemsFromListRequest) =>
      deleteItems.mutateAsync(params),
  }
}
