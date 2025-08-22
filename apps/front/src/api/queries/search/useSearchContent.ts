import { useApiQuery } from '@/hooks/useApi'
import type { GetSearchContentApiResponse } from '@ritchy/types'
import { useQueryClient } from '@tanstack/react-query'
import { userKeys } from '../users/useUserMe'

export const searchContentKeys = {
  all: ['searchContent'] as const,
  search: (searchId: string) => [...searchContentKeys.all, searchId] as const,
}

export const useSearchContentQuery = (searchId: string) => {
  const queryClient = useQueryClient()
  const result = useApiQuery<GetSearchContentApiResponse>(
    `/searches/${searchId}`,
    searchContentKeys.search(searchId),
  )

  queryClient.invalidateQueries({
    queryKey: userKeys.me(),
  })

  return result
}
