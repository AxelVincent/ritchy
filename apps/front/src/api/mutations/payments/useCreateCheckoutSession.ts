import { useApiMutation } from '@/hooks/useApi'
import type {
  CreateCheckoutSessionApiResponse,
  CreateCheckoutSessionRequest,
} from '@api/routes_web/payments/create-checkout-session/contract'

export const useCreateCheckoutSession = () => {
  return useApiMutation<
    CreateCheckoutSessionApiResponse,
    CreateCheckoutSessionRequest
  >('/payments/create-checkout-session')
}
