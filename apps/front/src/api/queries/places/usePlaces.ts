import { webApiClient } from '@/hooks/useApi'
import { useAuth } from '@clerk/clerk-react'
import type {
  PostGetPlacesApiResponse,
  PostGetPlacesRequest
} from '@ritchy/types'
import { useQuery } from '@tanstack/react-query'

export const placesKeys = {
  all: ['places'] as const,
  filters: (params: {
    filters: PostGetPlacesRequest['filters']
    listId?: string
    searchId?: string
  }) => [...placesKeys.all, 'filters', JSON.stringify(params)] as const
}

export const usePlacesQuery = ({
  filters = {
    operator: 'AND',
    conditions: []
  },
  listId,
  searchId
}: {
  filters?: PostGetPlacesRequest['filters']
  listId?: string
  searchId?: string
}) => {
  const { getToken } = useAuth()

  return useQuery<PostGetPlacesApiResponse>({
    queryKey: placesKeys.filters({ filters, listId, searchId }),
    queryFn: async () => {
      const token = await getToken()
      return webApiClient.fetchWithAuth(
        '/places',
        {
          method: 'POST',
          body: JSON.stringify({ filters, listId, searchId })
        },
        token
      )
    }
  })
}
