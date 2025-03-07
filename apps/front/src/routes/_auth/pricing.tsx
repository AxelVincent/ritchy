import { PricingCards } from '@/components/payment/PricingCards'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

// Define the promo type
interface PromoOffer {
  code: string
  discount: number
  planId: string
  validUntil: string // ISO date string
}

// Define the annual offer type
interface AnnualOffer {
  discount: number
  validUntil: string // ISO date string
}

export const Route = createFileRoute('/_auth/pricing')({
  component: PricingComponent,
})

function PricingComponent() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>(
    'monthly',
  )

  // Define active promotions
  const activePromos: PromoOffer[] = [
    {
      code: 'MARCH29',
      discount: 29,
      planId: 'ESSENTIALS',
      validUntil: '2025-03-31T23:59:59Z', // March 31, 2025
    },
    // Add more promos as needed
  ]

  // Define annual offer
  const annualOffer: AnnualOffer = {
    discount: 40,
    validUntil: '2025-03-30T23:59:59Z', // February 28, 2025
  }

  // Filter out expired promos
  const validPromos = activePromos.filter(
    (promo) => new Date(promo.validUntil) > new Date(),
  )

  // Check if annual offer is valid
  const isAnnualOfferValid = new Date(annualOffer.validUntil) > new Date()

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 overflow-y-auto max-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-bold">
            Simple pricing, upgrade as you scale
          </h1>

          <div className="mt-4 sm:mt-6 flex items-center justify-center gap-4">
            <div className="inline-flex rounded-full bg-secondary p-1">
              <button
                type="button"
                onClick={() => setBillingPeriod('monthly')}
                className={`rounded-full px-4 sm:px-6 py-1.5 sm:py-2 text-sm transition-colors ${
                  billingPeriod === 'monthly'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'hover:bg-secondary-hover text-muted-foreground'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingPeriod('yearly')}
                className={`rounded-full px-4 sm:px-6 py-1.5 sm:py-2 text-sm transition-colors ${
                  billingPeriod === 'yearly'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'hover:bg-secondary-hover text-muted-foreground'
                }`}
              >
                Yearly
              </button>
            </div>
          </div>

          {isAnnualOfferValid && billingPeriod === 'monthly' && (
            <div className="mt-3 sm:mt-4">
              <div className="inline-flex rounded-full bg-green-500/20 dark:bg-green-500/10 px-3 sm:px-6 py-2 sm:py-3">
                <p className="text-xs sm:text-sm font-medium text-green-700 dark:text-green-400">
                  Save up to {annualOffer.discount}% with yearly plan
                </p>
              </div>
            </div>
          )}

          {validPromos.length > 0 && (
            <div className="mt-3 sm:mt-4">
              <div className="inline-flex rounded-full bg-orange-500/20 dark:bg-orange-500/10 px-3 sm:px-6 py-2 sm:py-3">
                <p className="text-xs sm:text-sm font-medium text-orange-700 dark:text-orange-400">
                  Limited time offer: Use code {validPromos[0].code} for{' '}
                  {validPromos[0].discount}% off
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 sm:mt-12 pb-8">
          <PricingCards
            billingPeriod={billingPeriod}
            activePromos={validPromos}
            annualOffer={isAnnualOfferValid ? annualOffer : undefined}
          />
        </div>
      </div>
    </div>
  )
}
