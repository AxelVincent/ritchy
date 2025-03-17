import { useApiMutation } from '@/hooks/useApi'
import type { CreateListRequest, CreateListResponse } from '@ritchy/types'
import { useQueryClient } from '@tanstack/react-query'

export const useCreateList = () => {
  const queryClient = useQueryClient()

  return useApiMutation<CreateListResponse, CreateListRequest>('/lists', {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] })
    },
  })
}
