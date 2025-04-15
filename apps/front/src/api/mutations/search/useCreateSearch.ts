import { useApiMutation } from '@/hooks/useApi'
import type {
  CreateSearchApiResponse,
  CreateSearchRequestBody,
} from '@ritchy/types'
import { useQueryClient } from '@tanstack/react-query'

export const useCreateSearch = () => {
  const queryClient = useQueryClient()

  return useApiMutation<CreateSearchApiResponse, CreateSearchRequestBody>(
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
