import { useApiQuery } from '@/hooks/useApi'
import type { GetListContentApiResponse } from '@ritchy/types'

export const listContentKeys = {
  all: ['listContent'] as const,
  list: (listId: string) => [...listContentKeys.all, listId] as const,
}

export const useListContentQuery = (listId: string) => {
  return useApiQuery<GetListContentApiResponse>(
    `/lists/${listId}`,
    listContentKeys.list(listId),
  )
}
