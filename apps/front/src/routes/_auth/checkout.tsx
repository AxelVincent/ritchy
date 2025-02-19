import { useCreateCheckoutSession } from '@/api/mutations/payments/useCreateCheckoutSession'
import type { SubscriptionPlan } from '@ritchy/types'
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/_auth/checkout')({
  component: CheckoutComponent,
  validateSearch: (search) => ({
    plan: String(search.plan),
  }),
})

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
const stripePromise = loadStripe(
  String(import.meta.env.VITE_STRIPE_PUBLIC_KEY),
  {},
)

function CheckoutComponent() {
  const { plan } = Route.useSearch()
  const {
    mutate: createSession,
    data: checkoutSession,
    isPending,
  } = useCreateCheckoutSession()

  useEffect(() => {
    if (plan) {
      createSession({ plan: plan as SubscriptionPlan })
    }
  }, [plan, createSession])

  if (isPending) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        Loading...
      </div>
    )
  }

  if (!checkoutSession) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        Error: Failed to create checkout session
      </div>
    )
  }

  if ('error' in checkoutSession) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        Error: {checkoutSession.message || 'Failed to create checkout session'}
      </div>
    )
  }

  // Add redirect logic for client portal
  if (!checkoutSession.clientSecret && checkoutSession.portalUrl) {
    window.location.href = checkoutSession.portalUrl
    return null
  }

  const options = { clientSecret: checkoutSession.clientSecret }

  return (
    <div className="flex flex-col justify-center min-h-screen">
      <div className="max-h-[100dvh] overflow-y-auto px-4 py-2 w-full">
        <EmbeddedCheckoutProvider
          key={checkoutSession.clientSecret}
          stripe={stripePromise}
          options={options}
        >
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>
    </div>
  )
}
