import { useUserMe } from '@/api/queries/users/useUserMe'
import { CalButton } from '@/components/common/CalButton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/hooks/use-toast'
import type { Plan } from '@ritchy/types'
import { Link } from '@tanstack/react-router'
import {
  ArrowRightIcon,
  Building2,
  CheckIcon,
  Copy,
  Info,
  Plus,
  Users,
  Zap,
} from 'lucide-react'
import { useState } from 'react'

interface PricingTier {
  name: string
  plan: Plan | 'ENTERPRISE'
  monthlyPrice: number
  quarterlyPrice: number
  yearlyPrice: number
  description: string
  features: string[]
  isPopular?: boolean
  isEnterprise?: boolean
  icon: React.ReactNode
  seatCount: string
  businessListings: string
}

const pricingTiers: PricingTier[] = [
  {
    name: 'Essentials',
    plan: 'ESSENTIALS',
    monthlyPrice: 149,
    quarterlyPrice: 399,
    yearlyPrice: 1199,
    description:
      'Perfect for solo entrepreneurs and small agencies just getting started',
    features: [
      '240 business listings per locale',
      'Unlimited locales',
      '10,000 enrichments/month (email, social network)',
      'Advanced sorting and filters',
      'CRM features',
      'Calendar integration',
      'CSV Export',
    ],
    isPopular: true,
    icon: <CheckIcon className="h-6 w-6" />,
    seatCount: '1 seat',
    businessListings: '240 business listings per locale',
  },
  {
    name: 'Pro',
    plan: 'PRO',
    monthlyPrice: 399,
    quarterlyPrice: 999,
    yearlyPrice: 3499,
    description: 'For growing businesses with established sales processes',
    features: [
      'Unlimited enrichments (email, social network)',
      'Advanced sorting and filters',
      'CRM Integration (Hubspot, Salesforce & more)',
      'Organization management',
      'Dedicated slack support',
      'Onboarding session',
    ],
    isPopular: false,
    icon: <Zap className="h-6 w-6" />,
    seatCount: '2 seats',
    businessListings: '240 business listings per locale',
  },
  {
    name: 'Enterprise',
    plan: 'ENTERPRISE',
    monthlyPrice: 999,
    quarterlyPrice: 999,
    yearlyPrice: 999,
    description: 'Enterprise-grade solution for scaling companies',
    features: ['Customer success manager', 'Custom integrations'],
    isEnterprise: true,
    icon: <Building2 className="h-6 w-6" />,
    seatCount: '',
    businessListings: '',
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
  billingPeriod: 'monthly' | 'quarterly' | 'yearly'
  activePromos?: PromoOffer[]
  annualOffer?: AnnualOffer
  currency?: 'usd' | 'eur'
  onCurrencyChange?: (currency: 'usd' | 'eur') => void
}

// Seat upsell content component
const SeatUpsellContent = ({
  currency = 'usd',
}: { currency?: 'usd' | 'eur' }) => {
  const currencySymbol = currency === 'eur' ? '€' : '$'

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <CardTitle className="text-lg">Purchase additional seats</CardTitle>
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Each additional user</Label>
          <Badge variant="secondary" className="text-primary font-semibold">
            {currencySymbol}69
          </Badge>
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <CheckIcon className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
          <span className="text-sm">Full platform access</span>
        </div>
        <div className="flex items-start gap-3">
          <CheckIcon className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
          <span className="text-sm">240 search results included</span>
        </div>
        <div className="flex items-start gap-3">
          <CheckIcon className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
          <span className="text-sm">Can upgrade search power separately</span>
        </div>
      </div>

      <div className="pt-2">
        <CalButton variant="outline" size="sm" className="w-full">
          Contact us to add seats
        </CalButton>
      </div>
    </div>
  )
}

// Search power options content component
const SearchPowerContent = ({
  currency = 'usd',
}: { currency?: 'usd' | 'eur' }) => {
  const currencySymbol = currency === 'eur' ? '€' : '$'

  const searchTiers = [
    {
      name: 'Advanced',
      price: `${currencySymbol}90`,
      results: '1,000 search results (17x more)',
      capabilities: 'Advanced search capabilities',
      variant: 'secondary' as const,
    },
    {
      name: 'Enterprise',
      price: `${currencySymbol}280`,
      results: '4,000 search results (67x more)',
      capabilities: 'Enterprise-grade search capabilities',
      variant: 'secondary' as const,
    },
  ]

  return (
    <div className="space-y-4">
      <CardTitle className="text-lg">Search power options</CardTitle>

      <div className="space-y-3">
        {searchTiers.map((tier) => (
          <Card key={tier.name} className="p-4">
            <div className="flex items-center justify-between mb-3">
              <Label className="font-medium">{tier.name}</Label>
              <Badge variant={tier.variant} className="text-primary">
                {tier.price}
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <CheckIcon className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm">{tier.results}</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckIcon className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm">{tier.capabilities}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="pt-2">
        <CalButton variant="outline" size="sm" className="w-full">
          Contact us to upgrade search power
        </CalButton>
      </div>
    </div>
  )
}

export const PricingCards = ({
  billingPeriod,
  activePromos = [],
  currency = 'usd',
}: PricingCardsProps) => {
  const { data: me } = useUserMe()
  const [copiedPromo, setCopiedPromo] = useState<string | null>(null)

  // Get currency symbol based on currency prop
  const currencySymbol = currency === 'eur' ? '€' : '$'

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
      {pricingTiers.map((tier) => {
        const isCurrentPlan = me?.plan === tier.plan

        // Find applicable promo for this tier
        const applicablePromo = activePromos.find(
          (promo) => promo.planId === tier.plan,
        )

        const hasPromo = !!applicablePromo

        // Get price based on billing period
        let currentPrice = tier.monthlyPrice
        let periodsPerYear = 12
        let periodLabel = 'per month'

        if (billingPeriod === 'quarterly') {
          currentPrice = tier.quarterlyPrice
          periodsPerYear = 4
          periodLabel = 'per quarter'
        } else if (billingPeriod === 'yearly') {
          currentPrice = tier.yearlyPrice
          periodsPerYear = 1
          periodLabel = 'per year'
        }

        // Calculate price with promo if applicable
        const finalPrice = hasPromo
          ? Math.round(currentPrice * (1 - applicablePromo.discount / 100))
          : currentPrice

        // Calculate monthly equivalent and savings for quarterly/yearly
        const monthlyEquivalent =
          billingPeriod !== 'monthly'
            ? Math.round((finalPrice / (12 / periodsPerYear)) * 100) / 100
            : null

        const savingsPercentage =
          billingPeriod !== 'monthly' && monthlyEquivalent
            ? Math.round(
                ((tier.monthlyPrice - monthlyEquivalent) / tier.monthlyPrice) *
                  100,
              )
            : null

        return (
          <Card
            key={tier.name}
            className={`relative flex flex-col h-full ${
              tier.isPopular
                ? 'border-primary shadow-lg ring-2 ring-primary/20'
                : ''
            }`}
          >
            {tier.isPopular && (
              <Badge
                className="absolute -top-3 left-1/2 transform -translate-x-1/2"
                variant="default"
              >
                Most Popular
              </Badge>
            )}

            {/* Promo code alert */}
            {hasPromo && (
              <div className="absolute top-3 right-3">
                <Alert
                  className="w-auto cursor-pointer transition-colors hover:bg-muted/50 p-2"
                  onClick={() => copyPromoCode(applicablePromo.code)}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Copy className="h-3 w-3" />
                    <AlertDescription className="text-xs">
                      {copiedPromo === applicablePromo.code ? (
                        <>
                          <CheckIcon className="h-3 w-3 inline mr-1" />
                          Copied
                        </>
                      ) : (
                        <>
                          -{applicablePromo.discount}% {applicablePromo.code}
                        </>
                      )}
                    </AlertDescription>
                  </div>
                </Alert>
              </div>
            )}

            {/* Fixed height header for consistent alignment */}
            <CardHeader className="text-center pb-4 min-h-[280px] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-center mb-4">
                  {tier.icon}
                </div>
                <CardTitle className="text-2xl">{tier.name}</CardTitle>
                <CardDescription className="text-sm mt-2">
                  {tier.description}
                </CardDescription>
              </div>

              {/* Fixed height pricing section - dynamic height based on billing period */}
              <div
                className={`${billingPeriod === 'monthly' ? 'min-h-[120px]' : 'min-h-[160px]'} flex flex-col justify-end`}
              >
                {tier.isEnterprise ? (
                  <div>
                    <div className="text-4xl font-bold">
                      {currencySymbol}
                      {finalPrice}+
                    </div>
                    <Label className="text-muted-foreground text-sm">
                      per month spent
                    </Label>
                  </div>
                ) : (
                  <div>
                    {/* Show original price if there's a promo */}
                    {hasPromo && (
                      <div className="text-lg line-through text-muted-foreground">
                        {currencySymbol}
                        {currentPrice}
                      </div>
                    )}

                    {/* Show savings badge for quarterly/yearly */}
                    {savingsPercentage && savingsPercentage > 0 && (
                      <div className="mb-2">
                        <Badge
                          variant="secondary"
                          className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                        >
                          Save {savingsPercentage}%
                        </Badge>
                      </div>
                    )}

                    <div className="text-4xl font-bold">
                      {currencySymbol}
                      {finalPrice}
                    </div>
                    <Label className="text-muted-foreground text-sm">
                      {periodLabel}
                    </Label>

                    {/* Show monthly equivalent for quarterly/yearly */}
                    {monthlyEquivalent && (
                      <Label className="text-muted-foreground text-xs block mt-1">
                        {currencySymbol}
                        {monthlyEquivalent}/month
                      </Label>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>

            {/* Flexible content that grows to fill available space */}
            <CardContent className="flex-1 space-y-6">
              {/* Seat count section with upsell hover card - only for non-enterprise */}
              {!tier.isEnterprise && (
                <div className="flex items-center gap-2 text-sm min-h-[24px]">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <Label>{tier.seatCount}</Label>
                  {tier.plan === 'PRO' && (
                    <HoverCard>
                      <HoverCardTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 rounded-full"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-80" align="start">
                        <SeatUpsellContent currency={currency} />
                      </HoverCardContent>
                    </HoverCard>
                  )}
                </div>
              )}

              {/* Business listings section with search power hover card - only for non-enterprise */}
              {tier.businessListings && !tier.isEnterprise && (
                <div className="space-y-2 min-h-[60px]">
                  <div className="flex items-start gap-3 text-sm">
                    <CheckIcon className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <Label className="flex items-center gap-2">
                      {tier.businessListings}
                      {tier.plan === 'PRO' && (
                        <HoverCard>
                          <HoverCardTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 rounded-full"
                            >
                              <Info className="h-3 w-3" />
                            </Button>
                          </HoverCardTrigger>
                          <HoverCardContent className="w-80" align="start">
                            <SearchPowerContent currency={currency} />
                          </HoverCardContent>
                        </HoverCard>
                      )}
                    </Label>
                  </div>
                  <div className="flex items-start gap-3 text-sm">
                    <CheckIcon className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <Label>Unlimited locales</Label>
                  </div>
                </div>
              )}

              {/* Add equivalent spacing for Enterprise to align with other cards */}
              {tier.isEnterprise && (
                <div className="min-h-[0px]">
                  {' '}
                  {/* 24px (seat) + 60px (business listings) + 24px (separator gap) */}
                </div>
              )}

              {/* Separator only for non-enterprise */}
              {!tier.isEnterprise && <Separator />}

              {/* Key features section - consistent across all tiers */}
              <div className="space-y-4">
                <Label className="font-semibold text-sm uppercase text-muted-foreground">
                  {tier.isEnterprise
                    ? 'Everything in Pro, plus :'
                    : 'Key features:'}
                </Label>
                <div className="space-y-3">
                  {tier.features.map((feature) => (
                    <div
                      key={feature}
                      className="flex items-start gap-3 text-sm"
                    >
                      <CheckIcon className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <Label>{feature}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>

            {/* Fixed footer aligned at bottom */}
            <CardFooter className="flex-col space-y-4 mt-auto">
              {/* CTA Button */}
              {tier.isEnterprise ? (
                <CalButton
                  variant={tier.isPopular ? 'default' : 'outline'}
                  className="w-full flex items-center justify-center"
                >
                  Contact us
                  <ArrowRightIcon className="ml-2 h-4 w-4" />
                </CalButton>
              ) : (
                <Button
                  variant={tier.isPopular ? 'default' : 'outline'}
                  className="w-full"
                  asChild
                >
                  <Link
                    to={
                      isCurrentPlan
                        ? '/dashboard'
                        : `/checkout?plan=${tier.plan}&billingInterval=${billingPeriod}&currency=${currency}`
                    }
                    className="flex items-center justify-center"
                  >
                    {isCurrentPlan ? 'Manage subscription' : 'Start now'}
                    <ArrowRightIcon className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              )}
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}
