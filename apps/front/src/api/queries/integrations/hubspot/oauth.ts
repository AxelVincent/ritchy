import { useApiQuery } from '@/hooks/useApi'
import {
  type OAuthConnectUrlResponse,
  OAuthConnectUrlResponseSchema,
  type OAuthStatusResponse,
  OAuthStatusResponseSchema,
} from '@ritchy/types'

export const hubspotKeys = {
  all: ['hubspot'] as const,
  status: () => [...hubspotKeys.all, 'status'] as const,
  connectUrl: () => [...hubspotKeys.all, 'connect-url'] as const,
} as const

const HubspotStatusDisplaySchema = OAuthStatusResponseSchema.transform(
  (data) => {
    if ('error' in data) return 'disconnected' as const
    return data.connected ? ('connected' as const) : ('disconnected' as const)
  },
)

const HubspotConnectUrlDisplaySchema = OAuthConnectUrlResponseSchema.transform(
  (data) => {
    if ('error' in data) return null
    return data.authUrl
  },
)

export const useHubspotStatus = () => {
  return useApiQuery<OAuthStatusResponse, 'connected' | 'disconnected'>(
    '/hubspot/oauth/status',
    hubspotKeys.status(),
    {
      staleTime: 5 * 60 * 1000,
      zodSchema: HubspotStatusDisplaySchema,
    },
  )
}

export const useHubspotConnectUrl = () => {
  return useApiQuery<OAuthConnectUrlResponse, string | null>(
    '/hubspot/oauth/connect-url',
    hubspotKeys.connectUrl(),
    {
      staleTime: 0,
      zodSchema: HubspotConnectUrlDisplaySchema,
    },
  )
}
