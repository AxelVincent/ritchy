import { useApiMutation } from '@/hooks/useApi'
import type {
  CreateCheckoutSessionApiResponse,
  CreateCheckoutSessionRequestBody,
} from '@ritchy/types'

export const useCreateCheckoutSession = () => {
  return useApiMutation<
    CreateCheckoutSessionApiResponse,
    CreateCheckoutSessionRequestBody
  >('/payments/create-checkout-session')
}
