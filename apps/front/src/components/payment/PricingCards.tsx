import { useUserSubscription } from '@/api/queries/users/useUserSubscription'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Link } from '@tanstack/react-router'
import { CheckIcon, Gift } from 'lucide-react'

interface PricingTier {
  name: string
  priceId: string
  monthlyPrice: number
  yearlyPrice: number
  description: string
  features: string[]
  isPopular?: boolean
  leadCount: string
  searchRadius: string
  resultsPerSearch: string
  enrichments: string
  customLists: string
}

const pricingTiers: PricingTier[] = [
  {
    name: 'Navigator',
    priceId: import.meta.env.VITE_STRIPE_NAVIGATOR_PRICE_ID,
    monthlyPrice: 149,
    yearlyPrice: 99,
    description: 'Perfect for getting started',
    leadCount: 'Up to 3,000 leads - ($0.05/lead)',
    searchRadius: '50km²',
    resultsPerSearch: '240 results/search',
    enrichments: '3,000 enrichments',
    customLists: '5 custom lists',
    features: [
      'Up to 3,000 leads - ($0.05/lead)',
      'Search radius: 50km²',
      '240 results/search',
      '3,000 enrichments',
      '5 custom lists',
    ],
  },
  {
    name: 'Explorer',
    priceId: import.meta.env.VITE_STRIPE_EXPLORER_PRICE_ID,
    monthlyPrice: 249,
    yearlyPrice: 149,
    description: 'Most popular choice',
    isPopular: true,
    leadCount: 'Up to 10,000 leads - ($0.02/lead)',
    searchRadius: '100km²',
    resultsPerSearch: '1,000 results/search',
    enrichments: 'Unlimited enrichments',
    customLists: 'Unlimited custom lists',
    features: [
      'Up to 10,000 leads - ($0.02/lead)',
      'Search radius: 100km²',
      '1,000 results/search',
      'Unlimited enrichments',
      'Unlimited custom lists',
    ],
  },
  {
    name: 'Pro',
    priceId: import.meta.env.VITE_STRIPE_PRO_PRICE_ID,
    monthlyPrice: 499,
    yearlyPrice: 349,
    description: 'For power users',
    leadCount: 'Up to 90,000 leads - ($0.005/lead)',
    searchRadius: '150km²',
    resultsPerSearch: '4,000 results/search',
    enrichments: 'Unlimited enrichments',
    customLists: 'Unlimited custom lists',
    features: [
      'Up to 90,000 leads - ($0.005/lead)',
      'Search radius: 150km²',
      '4,000 results/search',
      'Unlimited enrichments',
      'Unlimited custom lists',
    ],
  },
]

interface PricingCardsProps {
  billingPeriod: 'monthly' | 'yearly'
}

export const PricingCards = ({ billingPeriod }: PricingCardsProps) => {
  const { data: subscription } = useUserSubscription()

  return (
    <div className="grid md:grid-cols-3 gap-8 mt-8">
      {pricingTiers.map((tier) => {
        console.log({
          subscriptionPlan: subscription?.plan,
          tierName: tier.name,
          normalized: tier.name.toLowerCase().replace(' ', ''),
        })

        const isCurrentPlan =
          subscription?.plan?.toLowerCase() ===
          tier.name.toLowerCase().replace(' ', '')

        return (
          <Card
            key={tier.name}
            className={`flex flex-col relative bg-background/50 ${
              tier.isPopular ? 'shadow-lg' : ''
            }`}
          >
            {tier.isPopular && (
              <Badge
                className="absolute right-6 top-6 px-6 py-1.5"
                variant="default"
              >
                Most Popular
              </Badge>
            )}

            <div className="flex flex-col h-full space-y-8 m-3">
              <div className="flex flex-col gap-2 bg-muted/50 rounded-lg p-6">
                <h3 className="text-2xl font-bold flex items-center gap-2">
                  {tier.name}
                  {isCurrentPlan && (
                    <span className="text-primary text-base font-medium">
                      (Current Plan)
                    </span>
                  )}
                </h3>

                <div className="mt-6 flex flex-col gap-2">
                  {billingPeriod === 'yearly' && (
                    <div className="flex items-center gap-4">
                      <span className="text-2xl line-through text-muted-foreground">
                        ${tier.monthlyPrice}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-5xl font-bold tracking-tight">
                      $
                      {billingPeriod === 'monthly'
                        ? tier.monthlyPrice
                        : tier.yearlyPrice}
                    </span>
                    {billingPeriod === 'yearly' && (
                      <Badge className="bg-green-600 hover:bg-green-700 px-6 py-1.5 text-white">
                        Save ${(tier.monthlyPrice - tier.yearlyPrice) * 12}/year
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-muted-foreground">
                    per month
                  </div>
                </div>
              </div>

              <ul className="space-y-6 flex-1 m-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex gap-3">
                    <CheckIcon className="h-6 w-6 flex-shrink-0" />
                    <span className="text-base">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="h-[80px] flex flex-col">
                <Button
                  className="w-full py-6 text-lg"
                  variant={tier.isPopular ? 'default' : 'outline'}
                  disabled={isCurrentPlan}
                  asChild={!isCurrentPlan}
                >
                  {isCurrentPlan ? (
                    <span>Current Plan</span>
                  ) : (
                    <Link to="/checkout" search={{ priceId: tier.priceId }}>
                      Get started
                      <span className="ml-2">→</span>
                    </Link>
                  )}
                </Button>

                {tier.name !== 'Map Navigator' && (
                  <div className="flex items-center justify-center gap-2 text-base mt-4">
                    <Gift className="h-5 w-5 text-green-600" />
                    <span>Consultation with our experts</span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
