import { useCreateCheckoutSession } from '@/api/mutations/payments/useCreateCheckoutSession'
import { getValidPromos } from '@/components/payment/promos'
import type { Plan } from '@ritchy/types'
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { createFileRoute } from '@tanstack/react-router'
import { CheckIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/_auth/checkout')({
  component: CheckoutComponent,
  validateSearch: (search) => ({
    plan: search.plan,
    billingInterval: search.billingInterval,
    currency: search.currency || 'usd',
  }),
})

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
const stripePromise = loadStripe(
  String(import.meta.env.VITE_STRIPE_PUBLIC_KEY),
  {},
)

function CheckoutComponent() {
  const { plan, billingInterval, currency } = Route.useSearch()
  const [copied, setCopied] = useState(false)
  const {
    mutate: createSession,
    data: checkoutSession,
    isPending,
  } = useCreateCheckoutSession()

  // Get valid promos for the current plan
  const validPromos = getValidPromos(plan as string)

  const handleCopyPromo = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  useEffect(() => {
    if (plan) {
      createSession({
        plan: plan as Plan,
        billingInterval: billingInterval as 'monthly' | 'yearly',
        currency: currency as 'usd' | 'eur',
      })
    }
  }, [plan, billingInterval, currency, createSession])

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

  // Configure options with appearance for dark mode
  const options = {
    clientSecret: checkoutSession.clientSecret,
  }

  return (
    <div className="flex flex-col justify-center min-h-screen">
      {validPromos.length > 0 && (
        <div className="flex justify-center mb-4">
          <div
            className="flex items-center gap-2 bg-orange-500/20 dark:bg-orange-500/10 px-4 py-2 rounded-full"
            onClick={() => handleCopyPromo(validPromos[0].code)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleCopyPromo(validPromos[0].code)
              }
            }}
          >
            <span className="text-sm font-medium text-orange-700 dark:text-orange-400">
              {copied ? (
                <span className="flex items-center">
                  <CheckIcon className="w-4 h-4 mr-1" /> Copied!
                </span>
              ) : (
                <>
                  Use code{' '}
                  <span className="font-bold">{validPromos[0].code}</span> for{' '}
                  {validPromos[0].discount}% off
                </>
              )}
            </span>
          </div>
        </div>
      )}
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
