import { useEffect } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { createFileRoute } from '@tanstack/react-router'
import { toast } from '@/hooks/use-toast'
import { useApiMutation } from '@/hooks/useApi'
import { z } from 'zod'

export const Route = createFileRoute('/_auth/hubspot/callback')({
  validateSearch: z.object({
    code: z.string().optional(),
    state: z.string(),
    error: z.string().optional(),
  }),
  component: CallbackRoute,
})

function CallbackRoute() {
  const navigate = useNavigate({ from: '/hubspot/callback' })
  const search = useSearch({ from: '/_auth/hubspot/callback' })
  const { mutate: exchangeCode } = useApiMutation<
    void,
    { code: string; state: string }
  >('/hubspot/callback', {
    method: 'POST',
    onSuccess: () => {
      toast({
        title: 'Successfully connected to HubSpot',
        variant: 'default',
      })
      // Close the popup if it was opened in one
      if (window.opener) {
        window.close()
      } else {
        // Redirect to main page if opened directly
        navigate({ to: '/hubspot', replace: true })
      }
    },
    onError: (error) => {
      toast({
        title: 'Failed to connect to HubSpot',
        description: error.message || 'Please try again',
        variant: 'destructive',
      })
      // Close the popup if it was opened in one
      if (window.opener) {
        window.close()
      } else {
        // Redirect to main page if opened directly
        navigate({ to: '/hubspot', replace: true })
      }
    },
  })

  useEffect(() => {
    if (search.error) {
      toast({
        title: 'HubSpot authorization failed',
        description: search.error,
        variant: 'destructive',
      })
      if (window.opener) {
        window.close()
      } else {
        navigate({ to: '/hubspot', replace: true })
      }
      return
    }

    if (search.code && search.state) {
      exchangeCode({ code: search.code, state: search.state })
    }
  }, [search, exchangeCode, navigate])

  return (
    <div className="container flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <LoadingSpinner message="Completing HubSpot connection..." />
        <p className="text-sm text-muted-foreground">
          Please wait while we complete the connection...
        </p>
      </div>
    </div>
  )
}
