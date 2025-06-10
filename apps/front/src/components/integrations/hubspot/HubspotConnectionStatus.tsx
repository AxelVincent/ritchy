import { useHubspotDisconnect } from '@/api/mutations/integrations/hubspot/oauth'
import {
  useHubspotConnectUrl,
  useHubspotStatus,
} from '@/api/queries/integrations/hubspot/oauth'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'

export const HubspotConnectionStatus = () => {
  const [isConnecting, setIsConnecting] = useState(false)

  const {
    data: status,
    isLoading: isStatusLoading,
    refetch,
  } = useHubspotStatus()
  const {
    data: authUrl,
    isLoading: isUrlLoading,
    refetch: refetchConnectUrl,
  } = useHubspotConnectUrl()
  const { mutate: disconnect, isPending: isDisconnecting } =
    useHubspotDisconnect()

  const handleConnect = async () => {
    const { data: freshAuthUrl } = await refetchConnectUrl()
    if (!freshAuthUrl) {
      toast({
        title: 'Failed to get HubSpot connection URL',
        description: 'Please try again later',
        variant: 'destructive',
      })
      return
    }

    setIsConnecting(true)
    try {
      const popup = window.open(
        freshAuthUrl,
        'hubspot-auth',
        'width=600,height=700',
      )

      const checkStatus = setInterval(async () => {
        if (popup?.closed) {
          clearInterval(checkStatus)
          setIsConnecting(false)
          await refetch()
        }
      }, 1000)

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
      { success: true },
      {
        onSuccess: async () => {
          await refetch()
          toast({
            title: 'Successfully disconnected from HubSpot',
            variant: 'default',
          })
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
    return null
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">Connection Status</h3>
            <p className="text-sm text-muted-foreground">
              {status === 'connected'
                ? 'Your HubSpot account is connected'
                : 'Connect your HubSpot account to get started'}
            </p>
          </div>
          {status === 'connected' ? (
            <Button
              variant="destructive"
              onClick={handleDisconnect}
              disabled={isConnecting || isDisconnecting}
            >
              {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
            </Button>
          ) : (
            <Button onClick={handleConnect} disabled={isConnecting || !authUrl}>
              {isConnecting ? 'Connecting...' : 'Connect HubSpot'}
            </Button>
          )}
        </div>

        {status === 'connected' ? (
          <Alert variant="default">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>Connected to HubSpot</AlertDescription>
            </div>
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
      </div>
    </Card>
  )
}
