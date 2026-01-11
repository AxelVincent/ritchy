import { useSingleEnrichment } from '@/api/mutations/enrichment/useSingleEnrichment'
import type { BulkEnrichmentApiResponse } from '@api/routes_web/enrich/bulk/contract'
import type { ApiErrorResponse } from '@api/shared'
import type { UseMutationResult } from '@tanstack/react-query'
import { type ReactNode, createContext, useContext } from 'react'

interface EnrichmentMutationContextValue {
  mutation: UseMutationResult<
    BulkEnrichmentApiResponse,
    ApiErrorResponse,
    { userPlaceId: string }
  >
}

const EnrichmentMutationContext =
  createContext<EnrichmentMutationContextValue | null>(null)

export const EnrichmentMutationProvider = ({
  children,
}: { children: ReactNode }) => {
  const mutation = useSingleEnrichment()

  return (
    <EnrichmentMutationContext.Provider value={{ mutation }}>
      {children}
    </EnrichmentMutationContext.Provider>
  )
}

export const useEnrichmentMutation = () => {
  const context = useContext(EnrichmentMutationContext)
  if (!context) {
    throw new Error(
      'useEnrichmentMutation must be used within EnrichmentMutationProvider',
    )
  }
  return context.mutation
}
