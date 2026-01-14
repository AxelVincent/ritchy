import { useApiQuery } from '@/hooks/useApi'
import type { ListsResponse } from '@api/routes_web/lists/list/contract'

const listsKeys = {
  all: ['lists'] as const,
}

export const useListsQuery = () => {
  return useApiQuery<ListsResponse>('/lists', listsKeys.all, {
    // Default options can be added here if needed
  })
}
