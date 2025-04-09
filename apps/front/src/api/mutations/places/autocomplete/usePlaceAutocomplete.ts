import { useApiMutation } from '@/hooks/useApi'
import type {
  AutocompleteApiResponse,
  AutocompleteRequestBody,
} from '@ritchy/types'

export const usePlaceAutocomplete = () => {
  return useApiMutation<AutocompleteApiResponse, AutocompleteRequestBody>(
    '/places/autocomplete',
    {
      method: 'POST',
      getEndpoint: () => '/places/autocomplete',
      getBody: (body) => body,
    },
  )
}
