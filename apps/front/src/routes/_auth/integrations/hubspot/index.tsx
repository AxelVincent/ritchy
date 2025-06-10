import { hubspotMappingKeys } from '@/api/queries/integrations/hubspot/mappings'
import { useHubspotStatus } from '@/api/queries/integrations/hubspot/oauth'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { HubspotConnectionStatus } from '@/components/integrations/hubspot/HubspotConnectionStatus'
import { HubspotMapping } from '@/components/integrations/hubspot/mapping/HubspotMapping'

import { Card } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'
import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { useEffect } from 'react'
import { z } from 'zod'

export const Route = createFileRoute('/_auth/integrations/hubspot/')({
  validateSearch: z.object({
    success: z.string().optional(),
    error: z.string().optional(),
  }),
  component: HubspotRoute,
})

function HubspotRoute() {
  const utils = useQueryClient()
  const navigate = useNavigate({ from: '/integrations/hubspot' })
  const search = useSearch({ from: '/_auth/integrations/hubspot/' })
  const { data: status, isLoading } = useHubspotStatus()

  // Handle OAuth callback results
  useEffect(() => {
    if (search.success === 'connected') {
      toast({
        title: 'Successfully connected to HubSpot',
        variant: 'default',
      })
      utils.invalidateQueries({
        queryKey: hubspotMappingKeys.company.mappings(),
      })
      utils.invalidateQueries({
        queryKey: hubspotMappingKeys.company.properties(),
      })
      utils.invalidateQueries({
        queryKey: hubspotMappingKeys.contact.mappings(),
      })
      utils.invalidateQueries({
        queryKey: hubspotMappingKeys.contact.properties(),
      })
      navigate({ to: '/integrations/hubspot', replace: true })
    } else if (search.error) {
      const errorMessages: Record<string, string> = {
        invalid_state: 'Invalid or expired connection request',
        oauth_failed: 'HubSpot authorization failed',
        no_code: 'No authorization code received',
        exchange_failed: 'Failed to complete connection',
      }

      toast({
        title: 'Failed to connect to HubSpot',
        description: errorMessages[search.error] || 'Please try again',
        variant: 'destructive',
      })
      // Clean up the URL
      navigate({ to: '/integrations/hubspot', replace: true })
    }
  }, [search, navigate, utils])

  // Handle subscription updates
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (
      params.get('portal_return') === 'true' ||
      params.get('checkout_return') === 'true'
    ) {
      utils.invalidateQueries({ queryKey: ['userSubscription'] })
      // Clean up the URL
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [utils])

  if (isLoading) {
    return <LoadingSpinner message="Loading HubSpot status..." />
  }

  return (
    <div className="container py-6 space-y-6 h-screen overflow-y-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          HubSpot Integration
        </h1>
        <p className="text-muted-foreground">
          Connect your HubSpot account to sync contacts and companies
        </p>
      </div>

      <HubspotConnectionStatus />

      {status === 'connected' && (
        <div className="flex-1 min-h-0">
          <HubspotMapping />
        </div>
      )}

      <Card className="p-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Available Features</h3>
          <ul className="list-disc list-inside space-y-2">
            <li>Sync companies between Ritchy and HubSpot</li>
            <li>Sync contacts between Ritchy and HubSpot</li>
          </ul>
        </div>
      </Card>
    </div>
  )
}
