import { useApiMutation } from '@/hooks/useApi'
import type {
  AutocompleteApiResponse,
  AutocompleteRequestBody,
} from '@api/routes_web/places/autocomplete/contract'

export const usePlaceAutocomplete = () => {
  return useApiMutation<AutocompleteApiResponse, AutocompleteRequestBody>(
    '/places/autocomplete',
    {
      getBody: (body) => body,
    },
  )
}
