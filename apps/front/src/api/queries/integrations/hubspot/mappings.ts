import { useApiQuery } from '@/hooks/useApi'
import type {
  GetCompanyMappingsResponse,
  GetCompanyPropertiesResponse,
  GetContactMappingsResponse,
  GetContactPropertiesResponse,
} from '@ritchy/types'

export const hubspotMappingKeys = {
  all: ['hubspot', 'mappings'] as const,
  company: {
    all: () => [...hubspotMappingKeys.all, 'company'] as const,
    properties: () =>
      [...hubspotMappingKeys.company.all(), 'properties'] as const,
    mappings: () => [...hubspotMappingKeys.company.all(), 'mappings'] as const,
  },
  contact: {
    all: () => [...hubspotMappingKeys.all, 'contact'] as const,
    properties: () =>
      [...hubspotMappingKeys.contact.all(), 'properties'] as const,
    mappings: () => [...hubspotMappingKeys.contact.all(), 'mappings'] as const,
  },
} as const

// Common query options for all mapping queries
const defaultQueryOptions = {
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
} as const

export const useCompanyProperties = () => {
  return useApiQuery<GetCompanyPropertiesResponse>(
    '/hubspot/mappings/company/properties',
    hubspotMappingKeys.company.properties(),
    defaultQueryOptions,
  )
}

export const useContactProperties = () => {
  return useApiQuery<GetContactPropertiesResponse>(
    '/hubspot/mappings/contact/properties',
    hubspotMappingKeys.contact.properties(),
    defaultQueryOptions,
  )
}

export const useCompanyMappings = () => {
  return useApiQuery<GetCompanyMappingsResponse>(
    '/hubspot/mappings/company',
    hubspotMappingKeys.company.mappings(),
    defaultQueryOptions,
  )
}

export const useContactMappings = () => {
  return useApiQuery<GetContactMappingsResponse>(
    '/hubspot/mappings/contact',
    hubspotMappingKeys.contact.mappings(),
    defaultQueryOptions,
  )
}
