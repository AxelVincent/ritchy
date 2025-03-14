import { useApiQuery } from '@/hooks/useApi'
import type { GetSearchesResponse } from '@ritchy/types'

const searchesKeys = {
  all: ['searches'] as const,
}

export const useSearchesQuery = () => {
  return useApiQuery<GetSearchesResponse>('/searches', searchesKeys.all)
}
