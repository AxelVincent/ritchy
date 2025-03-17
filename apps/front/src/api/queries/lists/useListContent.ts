import { useApiQuery } from '@/hooks/useApi'
import type { ListContentApiResponse } from '@ritchy/types'

const listContentKeys = {
  all: ['listContent'] as const,
  list: (listId: string) => [...listContentKeys.all, listId] as const,
}

export const useListContentQuery = (listId: string) => {
  return useApiQuery<ListContentApiResponse>(
    `/lists/${listId}`,
    listContentKeys.list(listId),
  )
}
