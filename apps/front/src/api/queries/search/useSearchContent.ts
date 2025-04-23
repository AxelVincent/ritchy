import { useApiQuery } from '@/hooks/useApi'
import type { GetSearchContentApiResponse } from '@ritchy/types'

export const searchContentKeys = {
  all: ['searchContent'] as const,
  search: (searchId: string) => [...searchContentKeys.all, searchId] as const,
}

export const useSearchContentQuery = (searchId: string) => {
  return useApiQuery<GetSearchContentApiResponse>(
    `/searches/${searchId}`,
    searchContentKeys.search(searchId),
  )
}
