import { useUserSubscription } from '@/api/queries/users/useUserSubscription'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'
import type { SubscriptionPlan } from '@ritchy/types'
import { Link } from '@tanstack/react-router'
import {
  ArrowRightIcon,
  CheckIcon,
  Gift,
  Plane,
  Rocket,
  Train,
  Zap,
} from 'lucide-react'
import { useState } from 'react'

interface PricingTier {
  name: string
  plan: SubscriptionPlan
  monthlyPrice: number
  yearlyPrice: number
  description: string
  amplifyResults: string[]
  maximizeConversion: string[]
  isPopular?: boolean
  icon: React.ReactNode
}

const pricingTiers: PricingTier[] = [
  {
    name: 'Essentials',
    plan: 'ESSENTIALS',
    monthlyPrice: 69,
    yearlyPrice: 42,
    description: 'Perfect for solo entrepreneurs just getting started',
    amplifyResults: [
      '60 Gmap results/search',
      'Search radius: 50km²',
      'Up to 3,000 leads',
      'Unlimited enrichments (email, social network)',
    ],
    maximizeConversion: [
      'Advanced sorting and filters*',
      'CRM features: Lists, Notes, Status',
      'CSV Export',
    ],
    icon: <Train className="h-6 w-6" />,
  },
  {
    name: 'Navigator',
    plan: 'NAVIGATOR',
    monthlyPrice: 149,
    yearlyPrice: 99,
    description: 'Ideal for small teams ready to accelerate growth',
    amplifyResults: [
      '240 Gmap results/search',
      'Search radius: 50km²',
      'Up to 10,000 leads',
      'Unlimited enrichments (email, social network)',
    ],
    maximizeConversion: [
      'Advanced sorting and filters*',
      'CRM features: Lists, Notes, Status',
      'CSV Export',
    ],
    icon: <Plane className="h-6 w-6" />,
  },
  {
    name: 'Explorer',
    plan: 'EXPLORER',
    monthlyPrice: 249,
    yearlyPrice: 149,
    description: 'For growing businesses with established sales processes',
    isPopular: true,
    amplifyResults: [
      '1,000 Gmap results/search',
      'Search radius: 100km²',
      'Up to 50,000 leads',
      'Unlimited enrichments (email, social network)',
    ],
    maximizeConversion: [
      'Advanced sorting and filters*',
      'CRM features: Lists, Notes, Status',
      'CSV Export',
      'Priority Support',
    ],
    icon: <Rocket className="h-6 w-6" />,
  },
  {
    name: 'Pro',
    plan: 'PRO',
    monthlyPrice: 499,
    yearlyPrice: 349,
    description: 'Enterprise-grade solution for scaling companies',
    amplifyResults: [
      '4,000 Gmap results/search',
      'Search radius: 150km²',
      'Up to 100,000 leads',
      'Unlimited enrichments (email, social network)',
    ],
    maximizeConversion: [
      'Advanced sorting and filters*',
      'CRM features: Lists, Notes, Status',
      'CSV Export',
      'Priority Support',
      'Priority Feature Requests',
    ],
    icon: <Zap className="h-6 w-6" />,
  },
]

interface PromoOffer {
  code: string
  discount: number
  planId: string
  validUntil: string
}

interface AnnualOffer {
  discount: number
  validUntil: string
}

interface PricingCardsProps {
  billingPeriod: 'monthly' | 'yearly'
  activePromos?: PromoOffer[]
  annualOffer?: AnnualOffer
}

export const PricingCards = ({
  billingPeriod,
  activePromos = [],
  annualOffer,
}: PricingCardsProps) => {
  const { data: subscription } = useUserSubscription()
  const [copiedPromo, setCopiedPromo] = useState<string | null>(null)

  // Function to copy promo code to clipboard
  const copyPromoCode = (code: string) => {
    navigator.clipboard
      .writeText(code)
      .then(() => {
        setCopiedPromo(code)
        toast({
          title: `Promo code ${code} copied to clipboard!`,
        })

        // Reset the copied state after 2 seconds
        setTimeout(() => {
          setCopiedPromo(null)
        }, 2000)
      })
      .catch(() => {
        toast({
          title: 'Failed to copy promo code',
        })
      })
  }

  // Check if annual offer is valid
  const isAnnualOfferValid =
    annualOffer && new Date(annualOffer.validUntil) > new Date()

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mt-8">
      {pricingTiers.map((tier) => {
        const isCurrentPlan =
          subscription?.plan?.toLowerCase() ===
          tier.name.toLowerCase().replace(' ', '')

        // Find applicable promo for this tier
        const applicablePromo = activePromos.find(
          (promo) => promo.planId === tier.plan && billingPeriod === 'monthly',
        )

        const hasPromo = !!applicablePromo
        const discountedPrice = hasPromo
          ? Math.round(tier.monthlyPrice * (1 - applicablePromo.discount / 100))
          : null

        return (
          <div key={tier.name} className="flex flex-col">
            {/* Promo badge container - maintains consistent height whether visible or not */}
            <div className="h-12 flex items-center justify-center mb-1">
              {hasPromo && (
                <button
                  type="button"
                  onClick={() => copyPromoCode(applicablePromo.code)}
                  className={`bg-orange-500 hover:bg-orange-600 text-white font-medium text-center py-2 px-4 rounded-md w-full transition-colors cursor-pointer flex items-center justify-center gap-2 ${
                    copiedPromo === applicablePromo.code ? 'bg-green-600' : ''
                  }`}
                  aria-label={`Copy promo code ${applicablePromo.code}`}
                >
                  {copiedPromo === applicablePromo.code ? (
                    <>
                      <CheckIcon className="h-4 w-4" /> Copied!
                    </>
                  ) : (
                    <>
                      {applicablePromo.discount}% OFF with code{' '}
                      {applicablePromo.code}
                    </>
                  )}
                </button>
              )}
            </div>

            <Card
              className={`flex flex-col relative bg-background/50 ${
                tier.isPopular ? 'shadow-lg' : ''
              }`}
            >
              {tier.isPopular && (
                <Badge
                  className="absolute right-6 top-6 px-3 py-1.5"
                  variant="default"
                >
                  Most Popular
                </Badge>
              )}

              <div className="flex flex-col h-full p-3">
                <div className="flex flex-col gap-2 bg-muted/50 rounded-lg p-6">
                  <h3 className="text-2xl font-bold flex items-center gap-2">
                    {tier.icon}
                    {tier.name}
                    {isCurrentPlan && (
                      <span className="text-primary text-base font-medium">
                        (Current Plan)
                      </span>
                    )}
                  </h3>

                  <p className="text-muted-foreground">{tier.description}</p>

                  <div className="mt-6 flex flex-col">
                    {/* Fixed height pricing container to maintain consistency */}
                    <div className="min-h-[120px] flex flex-col justify-end">
                      {/* Show original price as strikethrough with badge */}
                      {(hasPromo || billingPeriod === 'yearly') && (
                        <div className="flex items-center gap-4">
                          <span className="text-2xl line-through text-muted-foreground">
                            $
                            {billingPeriod === 'yearly'
                              ? tier.monthlyPrice
                              : tier.monthlyPrice}
                          </span>
                          {billingPeriod === 'yearly' && isAnnualOfferValid && (
                            <Badge className="bg-green-600 hover:bg-green-700 px-3 py-1 text-white text-xs">
                              Save $
                              {(tier.monthlyPrice - tier.yearlyPrice) * 12}/year
                            </Badge>
                          )}
                        </div>
                      )}
                      <div className="flex flex-col gap-2">
                        <span className="text-5xl font-bold tracking-tight">
                          $
                          {billingPeriod === 'monthly'
                            ? discountedPrice || tier.monthlyPrice
                            : tier.yearlyPrice}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-muted-foreground mt-1">
                        per month
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-6 flex-1">
                  <div>
                    <h4 className="font-semibold text-sm uppercase text-muted-foreground mb-3">
                      Amplify results
                    </h4>
                    <div className="space-y-4">
                      {tier.amplifyResults.map((feature) => (
                        <div key={feature} className="flex items-start gap-3">
                          <CheckIcon className="h-5 w-5 flex-shrink-0 text-green-500" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-sm uppercase text-muted-foreground mb-3">
                      Maximize conversion rate
                    </h4>
                    <div className="space-y-4">
                      {tier.maximizeConversion.map((feature) => (
                        <div key={feature} className="flex items-start gap-3">
                          <CheckIcon className="h-5 w-5 flex-shrink-0 text-green-500" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <Button
                    variant={tier.isPopular ? 'default' : 'outline'}
                    className="w-full justify-center"
                    asChild
                  >
                    <Link
                      to={
                        isCurrentPlan
                          ? '/dashboard'
                          : `/checkout?plan=${tier.plan}&billingInterval=${billingPeriod}`
                      }
                    >
                      {isCurrentPlan ? 'Current Plan' : 'Get started'}
                      {!isCurrentPlan && (
                        <ArrowRightIcon className="ml-2 h-4 w-4" />
                      )}
                    </Link>
                  </Button>

                  {/* Only show consultation with experts for Navigator plan and above */}
                  {(tier.plan === 'NAVIGATOR' ||
                    tier.plan === 'EXPLORER' ||
                    tier.plan === 'PRO') && (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Gift className="h-4 w-4 text-green-500" />
                      <span>Consultation with our experts</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        )
      })}
    </div>
  )
}
