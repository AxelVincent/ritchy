import { PricingCards } from '@/components/payment/PricingCards'
import {
  annualOffer,
  getValidPromos,
  isAnnualOfferValid,
} from '@/components/payment/promos'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/_auth/pricing')({
  component: PricingComponent,
})

function PricingComponent() {
  const [billingPeriod, setBillingPeriod] = useState<
    'monthly' | 'quarterly' | 'yearly'
  >('monthly')
  const [currency, setCurrency] = useState<'usd' | 'eur'>('usd')

  // Detect user's location and set currency on component mount
  useEffect(() => {
    const detectUserLocation = async () => {
      try {
        // Use the browser's Intl API to get user's region
        const userRegion = Intl.DateTimeFormat().resolvedOptions().timeZone

        // European timezones typically contain Europe/ or have specific country codes
        const europeanRegions = [
          /^Europe\//,
          /^GMT\+[0-2]/,
          /^CET/,
          /^WET/,
          /^EET/,
        ]

        const isEuropean = europeanRegions.some((regex) =>
          regex.test(userRegion),
        )
        setCurrency(isEuropean ? 'eur' : 'usd')
      } catch (error) {
        // Default to USD if detection fails
        console.error('Error detecting user location:', error)
        setCurrency('usd')
      }
    }

    detectUserLocation()
  }, [])

  // Get valid promos (without filtering by plan)
  const validPromos = getValidPromos()

  // Check if annual offer is valid
  const annualOfferValid = isAnnualOfferValid()

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 overflow-y-auto max-h-screen relative">
      {/* Currency toggle in top right corner */}
      <div className="absolute top-4 right-4 sm:top-8 sm:right-8 z-10">
        <div className="inline-flex rounded-full bg-secondary p-1">
          <button
            type="button"
            onClick={() => setCurrency('usd')}
            className={`rounded-full px-3 py-1 text-xs sm:text-sm transition-colors ${
              currency === 'usd'
                ? 'bg-background text-foreground shadow-sm'
                : 'hover:bg-secondary-hover text-muted-foreground'
            }`}
          >
            $ USD
          </button>
          <button
            type="button"
            onClick={() => setCurrency('eur')}
            className={`rounded-full px-3 py-1 text-xs sm:text-sm transition-colors ${
              currency === 'eur'
                ? 'bg-background text-foreground shadow-sm'
                : 'hover:bg-secondary-hover text-muted-foreground'
            }`}
          >
            € EUR
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-bold pt-12">
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
                onClick={() => setBillingPeriod('quarterly')}
                className={`rounded-full px-4 sm:px-6 py-1.5 sm:py-2 text-sm transition-colors ${
                  billingPeriod === 'quarterly'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'hover:bg-secondary-hover text-muted-foreground'
                }`}
              >
                Quarterly
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

          {annualOfferValid && billingPeriod === 'monthly' && (
            <div className="mt-3 sm:mt-4">
              <div className="inline-flex rounded-full bg-green-500/20 dark:bg-green-500/10 px-3 sm:px-6 py-2 sm:py-3">
                <p className="text-xs sm:text-sm font-medium text-green-700 dark:text-green-400">
                  Save up to {annualOffer.discount}% with yearly plan
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 sm:mt-12 pb-8">
          <PricingCards
            billingPeriod={billingPeriod}
            activePromos={validPromos}
            annualOffer={annualOfferValid ? annualOffer : undefined}
            currency={currency}
          />
        </div>
      </div>
    </div>
  )
}
