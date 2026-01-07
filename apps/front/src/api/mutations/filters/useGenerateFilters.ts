import { useApiMutation } from '@/hooks/useApi'
import type {
  GenerateFiltersApiResponse,
  GenerateFiltersRequest,
} from '@ritchy/types'

/**
 * Mutation hook for generating structured filters from natural language query.
 *
 * Uses Claude to parse user's natural language query and convert it into
 * structured filter rules that can be applied to the leads list.
 *
 * @example
 * const { mutateAsync, isPending } = useGenerateFilters()
 * const result = await mutateAsync({ query: "restaurants in Paris with 4+ stars" })
 */
export const useGenerateFilters = () => {
  return useApiMutation<GenerateFiltersApiResponse, GenerateFiltersRequest>(
    '/filters/generate',
    {
      // No cache invalidation needed - this is a pure generation endpoint
      // The generated filters will be applied via the filter state management
    },
  )
}
