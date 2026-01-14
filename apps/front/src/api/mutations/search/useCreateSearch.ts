import { useApiMutation } from '@/hooks/useApi'
import type {
  CreateSearchApiResponse,
  CreateSearchRequest,
} from '@api/routes_web/searches/create/contract'
import { useQueryClient } from '@tanstack/react-query'

export const useCreateSearch = () => {
  const queryClient = useQueryClient()

  return useApiMutation<CreateSearchApiResponse, CreateSearchRequest>(
    '/searches',
    {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ['searches'],
          exact: true,
        })
      },
      onMutate: () => {
        queryClient.cancelQueries({ queryKey: ['searches'] })
      },
    },
  )
}
