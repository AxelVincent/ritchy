import { PricingCards } from '@/components/payment/PricingCards'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/_auth/pricing')({
  component: PricingComponent,
})

function PricingComponent() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>(
    'monthly',
  )

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

          <div className="mt-3 sm:mt-4">
            <div className="inline-flex rounded-full bg-green-500/20 dark:bg-green-500/10 px-3 sm:px-6 py-2 sm:py-3">
              <p className="text-xs sm:text-sm font-medium text-green-700 dark:text-green-400">
                Save up to 40% with annual plan
                <span className="mx-2">•</span>
                Offer ends 02/28
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 sm:mt-12 pb-8">
          <PricingCards billingPeriod={billingPeriod} />
        </div>
      </div>
    </div>
  )
}
