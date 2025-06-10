import { hubspotMappingKeys } from '@/api/queries/integrations/hubspot/mappings'
import { useApiMutation } from '@/hooks/useApi'
import type {
  UpdateCompanyMappingBody,
  UpdateCompanyMappingResponse,
  UpdateContactMappingBody,
  UpdateContactMappingResponse,
} from '@ritchy/types'
import type {
  GetCompanyMappingsResponse,
  GetContactMappingsResponse,
} from '@ritchy/types'
import { useQueryClient } from '@tanstack/react-query'

// Company mapping mutations
export const useUpdateCompanyMapping = () => {
  const queryClient = useQueryClient()

  return useApiMutation<UpdateCompanyMappingResponse, UpdateCompanyMappingBody>(
    '/hubspot/mappings/company',
    {
      method: 'PUT',
      onMutate: async ({ internalField, hubspotField }) => {
        await queryClient.cancelQueries({
          queryKey: hubspotMappingKeys.company.mappings(),
        })
        const previousMappings =
          queryClient.getQueryData<GetCompanyMappingsResponse>(
            hubspotMappingKeys.company.mappings(),
          )
        queryClient.setQueryData<GetCompanyMappingsResponse>(
          hubspotMappingKeys.company.mappings(),
          (old) => {
            if (!old || 'error' in old) return old
            return old.map((mapping) =>
              mapping.internalField === internalField
                ? { ...mapping, hubspotField }
                : mapping,
            )
          },
        )
        return { previousMappings }
      },
      onError: (_, __, context: unknown) => {
        const typedContext = context as {
          previousMappings?: GetCompanyMappingsResponse
        }
        if (typedContext?.previousMappings) {
          queryClient.setQueryData(
            hubspotMappingKeys.company.mappings(),
            typedContext.previousMappings,
          )
        }
      },
      onSettled: () => {
        queryClient.invalidateQueries({
          queryKey: hubspotMappingKeys.company.mappings(),
        })
      },
    },
  )
}

export const useResetCompanyMappings = () => {
  const queryClient = useQueryClient()

  return useApiMutation<{ success: boolean }, Record<string, never>>(
    '/hubspot/mappings/company/reset',
    {
      method: 'POST',
      onMutate: async () => {
        await queryClient.cancelQueries({
          queryKey: hubspotMappingKeys.company.mappings(),
        })
        const previousMappings =
          queryClient.getQueryData<GetCompanyMappingsResponse>(
            hubspotMappingKeys.company.mappings(),
          )
        return { previousMappings }
      },
      onError: (_, __, context: unknown) => {
        const typedContext = context as {
          previousMappings?: GetCompanyMappingsResponse
        }
        if (typedContext?.previousMappings) {
          queryClient.setQueryData(
            hubspotMappingKeys.company.mappings(),
            typedContext.previousMappings,
          )
        }
      },
      onSettled: () => {
        queryClient.invalidateQueries({
          queryKey: hubspotMappingKeys.company.mappings(),
        })
      },
    },
  )
}

// Contact mapping mutations
export const useUpdateContactMapping = () => {
  const queryClient = useQueryClient()

  return useApiMutation<UpdateContactMappingResponse, UpdateContactMappingBody>(
    '/hubspot/mappings/contact',
    {
      method: 'PUT',
      onMutate: async ({ internalField, hubspotField }) => {
        // Cancel any outgoing refetches
        await queryClient.cancelQueries({
          queryKey: hubspotMappingKeys.contact.mappings(),
        })

        // Snapshot the previous value
        const previousMappings =
          queryClient.getQueryData<GetContactMappingsResponse>(
            hubspotMappingKeys.contact.mappings(),
          )

        // Optimistically update the mappings
        queryClient.setQueryData<GetContactMappingsResponse>(
          hubspotMappingKeys.contact.mappings(),
          (old) => {
            if (!old || 'error' in old) return old
            return old.map((mapping) =>
              mapping.internalField === internalField
                ? { ...mapping, hubspotField }
                : mapping,
            )
          },
        )

        // Return a context object with the snapshotted value
        return { previousMappings }
      },
      onError: (_, __, context: unknown) => {
        const typedContext = context as {
          previousMappings?: GetContactMappingsResponse
        }
        if (typedContext?.previousMappings) {
          queryClient.setQueryData(
            hubspotMappingKeys.contact.mappings(),
            typedContext.previousMappings,
          )
        }
      },
      onSettled: () => {
        // Always refetch after error or success to ensure we have the correct server state
        queryClient.invalidateQueries({
          queryKey: hubspotMappingKeys.contact.mappings(),
        })
      },
    },
  )
}

export const useResetContactMappings = () => {
  const queryClient = useQueryClient()

  return useApiMutation<{ success: boolean }, Record<string, never>>(
    '/hubspot/mappings/contact/reset',
    {
      method: 'POST',
      onMutate: async () => {
        await queryClient.cancelQueries({
          queryKey: hubspotMappingKeys.contact.mappings(),
        })
        const previousMappings =
          queryClient.getQueryData<GetContactMappingsResponse>(
            hubspotMappingKeys.contact.mappings(),
          )
        return { previousMappings }
      },
      onError: (_, __, context: unknown) => {
        const typedContext = context as {
          previousMappings?: GetContactMappingsResponse
        }
        if (typedContext?.previousMappings) {
          queryClient.setQueryData(
            hubspotMappingKeys.contact.mappings(),
            typedContext.previousMappings,
          )
        }
      },
      onSettled: () => {
        queryClient.invalidateQueries({
          queryKey: hubspotMappingKeys.contact.mappings(),
        })
      },
    },
  )
}
