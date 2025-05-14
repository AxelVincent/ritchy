import { userKeys } from '@/api/queries/users/useUserMe'
import { useApiMutation } from '@/hooks/useApi'
import type {
  ValidateDemoCodeApiResponse,
  ValidateDemoCodeRequest,
} from '@ritchy/types'
import { useQueryClient } from '@tanstack/react-query'

export const useValidateDemoCode = () => {
  const queryClient = useQueryClient()

  return useApiMutation<ValidateDemoCodeApiResponse, ValidateDemoCodeRequest>(
    '/users/validate-demo-code',
    {
      onSuccess: () => {
        queryClient.invalidateQueries()
      },
      onMutate: () => {
        queryClient.cancelQueries({ queryKey: userKeys.me() })
      },
    },
  )
}
