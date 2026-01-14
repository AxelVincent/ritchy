import { useApiQuery } from '@/hooks/useApi'
import type { GetSearchesResponse } from '@api/routes_web/searches/get-all/contract'

const searchesKeys = {
  all: ['searches'] as const,
}

export const useSearchesQuery = () => {
  return useApiQuery<GetSearchesResponse>('/searches', searchesKeys.all)
}
