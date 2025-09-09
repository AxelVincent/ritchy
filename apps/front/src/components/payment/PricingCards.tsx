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
  Search,
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
  tagline: string
  features: string[]
  isPopular?: boolean
  isEnterprise?: boolean
  icon: React.ReactNode
  seatCount: string
  searchResults: string
  enrichmentLimit: string
  accountLimit: string
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
    tagline: 'Prospecting made easy',
    features: [
      '+260M businesses available',
      'Precise search by keyword',
      'Search history',
      'Map and spreadsheet display',
      'Real time and verified data',
      'Complete AI customer website analysis',
      'Create personalised lists',
      'Keep track of your progress with statuses',
      'Take notes during calls',
    ],
    isPopular: false,
    icon: <Search className="h-6 w-6" />,
    seatCount: '1 seat',
    searchResults: '5,000 search results/month',
    enrichmentLimit: '1,500 enrichment/month',
    accountLimit: 'Add up to 5k accounts in lists',
  },
  {
    name: 'Pro',
    plan: 'PRO',
    monthlyPrice: 399,
    quarterlyPrice: 999,
    yearlyPrice: 3499,
    description: 'For growing businesses with established sales processes',
    tagline: 'Fuel Your Growth',
    features: [
      'Organization management',
      'Dedicated slack channel',
      'Roadmap prioritization',
    ],
    isPopular: true,
    icon: <Zap className="h-6 w-6" />,
    seatCount: 'Unlimited seats',
    searchResults: '15,000 search results/month',
    enrichmentLimit: '5,000 enrichment/month',
    accountLimit: 'Add up to 20k accounts in lists',
  },
  {
    name: 'Enterprise',
    plan: 'ENTERPRISE',
    monthlyPrice: 0, // Will show "Ask for a quote"
    quarterlyPrice: 0,
    yearlyPrice: 0,
    description:
      'Strategic GTM Workflows, Made for you. High-impact, entreprise-grade automations tailored for your pipeline.',
    tagline: 'Your market. Fully covered',
    features: [
      'Dedicated GTM expert & tech lead',
      'Tailored to capture your exact TAM',
      'Ready-to-contact lead list',
      'Deep enrichment - LinkedIn company & profiles, Instagram accounts & posts, external APIs, AI & more',
      'ICP & needs assessment',
      'Custom data exports, business owner contact, WhatsApp verified number, your choice!',
    ],
    isEnterprise: true,
    icon: <Building2 className="h-6 w-6" />,
    seatCount: '',
    searchResults: '',
    enrichmentLimit: '',
    accountLimit: '',
  },
]

// Plan hierarchy for determining upgrades vs downgrades
const planHierarchy = {
  FREE: 0,
  ESSENTIALS: 1,
  PRO: 2,
  ENTERPRISE: 3,
}

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

export const PricingCards = ({
  billingPeriod,
  activePromos = [],
  currency = 'usd',
}: PricingCardsProps) => {
  const { data: me } = useUserMe()
  const [copiedPromo, setCopiedPromo] = useState<string | null>(null)

  // Get currency symbol based on currency prop
  const currencySymbol = currency === 'eur' ? '€' : '$'

  // Check if user has any active subscription
  const hasActiveSubscription = me?.plan && me.plan !== 'FREE'

  // Function to determine if this is an upgrade or downgrade
  const getPlanAction = (tierPlan: string) => {
    if (!hasActiveSubscription) return 'Try for free'

    const currentPlanLevel =
      planHierarchy[me?.plan as keyof typeof planHierarchy] || 0
    const tierPlanLevel =
      planHierarchy[tierPlan as keyof typeof planHierarchy] || 0

    if (tierPlanLevel > currentPlanLevel) return 'Upgrade plan'
    if (tierPlanLevel < currentPlanLevel) return 'Downgrade plan'
    return 'Manage subscription'
  }

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
                <div className="mt-2">
                  <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                    {tier.tagline}
                  </span>
                </div>
              </div>

              {/* Fixed height pricing section - dynamic height based on billing period */}
              <div
                className={`${billingPeriod === 'monthly' ? 'min-h-[120px]' : 'min-h-[160px]'} flex flex-col justify-end`}
              >
                {tier.isEnterprise ? (
                  <div>
                    <div className="text-4xl font-bold">Ask for a quote</div>
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
              {/* Seat count section - only for non-enterprise */}
              {!tier.isEnterprise && (
                <div className="flex items-center gap-2 text-sm min-h-[24px]">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <Label>{tier.seatCount}</Label>
                </div>
              )}

              {/* Search results section - only for non-enterprise */}
              {tier.searchResults && !tier.isEnterprise && (
                <div className="flex items-start gap-3 text-sm">
                  <CheckIcon className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <Label>{tier.searchResults}</Label>
                </div>
              )}

              {/* Enrichment limit section - only for non-enterprise */}
              {tier.enrichmentLimit && !tier.isEnterprise && (
                <div className="flex items-start gap-3 text-sm">
                  <CheckIcon className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <Label>{tier.enrichmentLimit}</Label>
                </div>
              )}

              {/* Account limit section - only for non-enterprise */}
              {tier.accountLimit && !tier.isEnterprise && (
                <div className="flex items-start gap-3 text-sm">
                  <CheckIcon className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <Label>{tier.accountLimit}</Label>
                </div>
              )}

              {/* Add equivalent spacing for Enterprise to align with other cards */}
              {tier.isEnterprise && (
                <div className="min-h-[120px]">
                  {/* Equivalent spacing for seat + search results + enrichment + account limits */}
                </div>
              )}

              {/* Separator only for non-enterprise */}
              {!tier.isEnterprise && <Separator />}

              {/* Key features section - consistent across all tiers */}
              <div className="space-y-4">
                <Label className="font-semibold text-sm uppercase text-muted-foreground">
                  {tier.isEnterprise
                    ? 'Everything in Pro, plus :'
                    : tier.plan === 'PRO'
                      ? 'Everything in Essentials, plus :'
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
                    to={`/checkout?plan=${tier.plan}&billingInterval=${billingPeriod}&currency=${currency}`}
                    className="flex items-center justify-center"
                  >
                    {getPlanAction(tier.plan)}
                    <ArrowRightIcon className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              )}

              {/* No credit card required text for non-enterprise */}
              {!tier.isEnterprise && !hasActiveSubscription && (
                <p className="text-xs text-muted-foreground text-center">
                  No credit card required
                </p>
              )}
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}
