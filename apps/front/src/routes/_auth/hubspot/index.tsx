import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { useApiMutation, useApiQuery } from '@/hooks/useApi'
import { z } from 'zod'

export const HubspotStatusSchema = z.object({
  connected: z.boolean(),
  scopes: z.array(z.string()),
  expiresAt: z.number().optional(),
  authUrl: z.string().optional(),
})

export type HubspotStatus = z.infer<typeof HubspotStatusSchema>

export const useHubspotStatus = () => {
  return useApiQuery<HubspotStatus>('/hubspot/status', ['hubspot', 'status'], {
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export const useHubspotDisconnect = () => {
  return useApiMutation<void, Record<string, unknown>>('/hubspot/disconnect', {
    method: 'POST',
  })
}

// Add new hook for getting connection URL
export const useHubspotConnectUrl = () => {
  return useApiQuery<{ authUrl: string }>(
    '/hubspot/connect-url',
    ['hubspot', 'connect-url'],
    {
      staleTime: 0,
    },
  )
}

export const Route = createFileRoute('/_auth/hubspot/')({
  validateSearch: z.object({
    success: z.string().optional(),
    error: z.string().optional(),
  }),
  component: HubspotRoute,
})

function HubspotRoute() {
  const utils = useQueryClient()
  const navigate = useNavigate({ from: '/hubspot' })
  const search = useSearch({ from: '/_auth/hubspot/' })
  const [isConnecting, setIsConnecting] = useState(false)

  // Use the API hooks
  const {
    data: status,
    isLoading: isStatusLoading,
    refetch,
  } = useHubspotStatus()
  const { data: connectData, isLoading: isUrlLoading } = useHubspotConnectUrl()
  const { mutate: disconnect, isPending: isDisconnecting } =
    useHubspotDisconnect()

  // Handle OAuth callback results
  useEffect(() => {
    if (search.success === 'connected') {
      toast({
        title: 'Successfully connected to HubSpot',
        variant: 'default',
      })
      refetch()
      // Clean up the URL
      navigate({ to: '/hubspot', replace: true })
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
      navigate({ to: '/hubspot', replace: true })
    }
  }, [search, refetch, navigate])

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

  const handleConnect = async () => {
    if (!connectData?.authUrl) return

    setIsConnecting(true)
    try {
      // Open HubSpot auth in a popup
      const popup = window.open(
        connectData.authUrl,
        'hubspot-auth',
        'width=600,height=700',
      )

      // Poll for status changes
      const checkStatus = setInterval(async () => {
        if (popup?.closed) {
          clearInterval(checkStatus)
          setIsConnecting(false)
          await refetch()
        }
      }, 1000)

      // Cleanup interval after 10 minutes
      setTimeout(
        () => {
          clearInterval(checkStatus)
          setIsConnecting(false)
        },
        10 * 60 * 1000,
      )
    } catch (error) {
      console.error('Failed to start HubSpot connection:', error)
      setIsConnecting(false)
      toast({
        title: 'Failed to connect to HubSpot',
        description: 'Please try again later',
        variant: 'destructive',
      })
    }
  }

  const handleDisconnect = () => {
    disconnect(
      {},
      {
        onSuccess: () => {
          toast({
            title: 'Successfully disconnected from HubSpot',
            variant: 'default',
          })
          refetch()
        },
        onError: (error) => {
          toast({
            title: 'Failed to disconnect from HubSpot',
            description: error.message || 'Please try again later',
            variant: 'destructive',
          })
        },
      },
    )
  }

  if (isStatusLoading || isUrlLoading) {
    return <LoadingSpinner message="Loading HubSpot status..." />
  }

  return (
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          HubSpot Integration
        </h1>
        <p className="text-muted-foreground">
          Connect your HubSpot account to sync contacts and deals
        </p>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">Connection Status</h3>
              <p className="text-sm text-muted-foreground">
                {status?.connected
                  ? 'Your HubSpot account is connected'
                  : 'Connect your HubSpot account to get started'}
              </p>
            </div>
            {status?.connected ? (
              <Button
                variant="destructive"
                onClick={handleDisconnect}
                disabled={isConnecting || isDisconnecting}
              >
                {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
              </Button>
            ) : (
              <Button
                onClick={handleConnect}
                disabled={isConnecting || !connectData?.authUrl}
              >
                {isConnecting ? 'Connecting...' : 'Connect HubSpot'}
              </Button>
            )}
          </div>

          {status?.connected ? (
            <Alert variant="default">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Connected to HubSpot
                {status.expiresAt && (
                  <span className="block text-xs mt-1">
                    Token expires: {new Date(status.expiresAt).toLocaleString()}
                  </span>
                )}
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="default">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Not connected to HubSpot. Connect your account to enable
                integration features.
              </AlertDescription>
            </Alert>
          )}

          {status?.scopes && (
            <div className="text-sm text-muted-foreground">
              <p className="font-medium">Enabled Scopes:</p>
              <ul className="list-disc list-inside mt-1">
                {status.scopes.map((scope) => (
                  <li key={scope}>{scope}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Card>

      {/* Add more sections here for HubSpot features */}
      <Card className="p-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Available Features</h3>
          <ul className="list-disc list-inside space-y-2">
            <li>Sync contacts between Ritchie and HubSpot</li>
            <li>Import deals and opportunities</li>
            <li>Track customer interactions</li>
            <li>Automate workflows</li>
          </ul>
        </div>
      </Card>
    </div>
  )
}
