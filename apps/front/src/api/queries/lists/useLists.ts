import { useApiQuery } from '@/hooks/useApi'
import type { Lists } from '@ritchy/types'

const listsKeys = {
  all: ['lists'] as const,
}

export const useListsQuery = () => {
  return useApiQuery<Lists>('/lists', listsKeys.all, {
    // Default options can be added here if needed
  })
}
