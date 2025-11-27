import { useUserMe } from '@/api/queries/users/useUserMe'
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { toast } from '@/hooks/use-toast'
import type { Plan } from '@ritchy/types'
import { Link } from '@tanstack/react-router'
import {
  ArrowRightIcon,
  Building2,
  CheckIcon,
  Copy,
  Info,
  Search,
  Zap,
} from 'lucide-react'
import { useState } from 'react'

interface PricingTier {
  name: string
  plan: Plan | 'ENTERPRISE'
  description: string
  tagline: string
  features: string[]
  isPopular?: boolean
  isEnterprise?: boolean
  icon: React.ReactNode
  seatCount: string
  creditsPerMonth: string
  leadLimit: string
}

// Currency-based pricing configuration
const pricingByCurrency = {
  usd: {
    ESSENTIALS: {
      monthlyPrice: 149,
      quarterlyPrice: 406,
      yearlyPrice: 1445,
    },
    PRO: {
      monthlyPrice: 267,
      quarterlyPrice: 723,
      yearlyPrice: 2570,
    },
    ENTERPRISE: {
      monthlyPrice: 699,
      quarterlyPrice: 1890,
      yearlyPrice: 6723,
    },
  },
  eur: {
    ESSENTIALS: {
      monthlyPrice: 129,
      quarterlyPrice: 348,
      yearlyPrice: 1238,
    },
    PRO: {
      monthlyPrice: 229,
      quarterlyPrice: 619,
      yearlyPrice: 2198,
    },
    ENTERPRISE: {
      monthlyPrice: 599,
      quarterlyPrice: 1617,
      yearlyPrice: 5750,
    },
  },
}

const pricingTiers: PricingTier[] = [
  {
    name: 'Essentials',
    plan: 'ESSENTIALS',
    description: 'Perfect for entrepreneurs',
    tagline: 'Prospecting made easy',
    features: [
      'Visual territory management',
      'Complete business intelligence enrichment',
      'Create personalised prospect lists',
      'Repeat search to detect new prospects',
      'Built-in email verifier',
      'Prospect pipeline with custom statuses',
      'Notes and progress tracking',
      'CSV Export',
      'Email support',
    ],
    isPopular: false,
    icon: <Search className="h-6 w-6" />,
    seatCount: '1 user seat',
    creditsPerMonth: '1,000 credits',
    leadLimit: 'Manage up to 1,000 leads',
  },
  {
    name: 'Pro',
    plan: 'PRO',
    description: 'Built for small sales teams',
    tagline: 'Fuel your growth',
    features: [
      'Team collaboration & lead sharing',
      'Zapier integration',
      'Onboarding session',
      'Dedicated Slack/WhatsApp support channel',
    ],
    isPopular: true,
    icon: <Zap className="h-6 w-6" />,
    seatCount: '3 user seats',
    creditsPerMonth: '3,000 credits',
    leadLimit: 'Manage up to 10,000 leads',
  },
  {
    name: 'Enterprise',
    plan: 'ENTERPRISE',
    description: 'Scale across your organization',
    tagline: 'Dominate your market',
    features: [
      'Custom limits',
      'Playbook included',
      'Dedicated account manager',
    ],
    isEnterprise: false,
    icon: <Building2 className="h-6 w-6" />,
    seatCount: 'Unlimited user seats',
    creditsPerMonth: '10,000 credits',
    leadLimit: 'Manage up to 25,000 leads',
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

  // Function to get pricing for a specific plan and currency
  const getPricing = (plan: string, currency: 'usd' | 'eur') => {
    return pricingByCurrency[currency][
      plan as keyof typeof pricingByCurrency.usd
    ]
  }

  // Function to determine if this is an upgrade or downgrade
  const getPlanAction = (tierPlan: string) => {
    if (!hasActiveSubscription) return 'Get started'

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
    <TooltipProvider>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {pricingTiers.map((tier) => {
          // Find applicable promo for this tier
          const applicablePromo = activePromos.find(
            (promo) => promo.planId === tier.plan,
          )

          const hasPromo = !!applicablePromo

          // Get pricing for current currency
          const tierPricing = getPricing(tier.plan, currency)

          // Get price based on billing period
          let currentPrice = tierPricing.monthlyPrice
          let periodsPerYear = 12
          let periodLabel = 'per month'

          if (billingPeriod === 'quarterly') {
            currentPrice = tierPricing.quarterlyPrice
            periodsPerYear = 4
            periodLabel = 'per quarter'
          } else if (billingPeriod === 'yearly') {
            currentPrice = tierPricing.yearlyPrice
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
                  ((tierPricing.monthlyPrice - monthlyEquivalent) /
                    tierPricing.monthlyPrice) *
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
                      ~{currencySymbol}
                      {monthlyEquivalent}/month
                    </Label>
                  )}
                </div>
              </CardHeader>

              {/* Flexible content that grows to fill available space */}
              <CardContent className="flex-1 space-y-6">
                {/* Seat count section */}
                <div className="flex items-center gap-2 text-sm min-h-[24px]">
                  <CheckIcon className="h-4 w-4 text-green-500" />
                  <Label>{tier.seatCount}</Label>
                </div>

                {/* Unlimited searches section */}
                <div className="flex items-start gap-3 text-sm">
                  <CheckIcon className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <Label>
                    Unlimited keyword-based business searches powered by Google
                    Maps
                  </Label>
                </div>

                {/* Credits per month section with tooltip */}
                <div className="flex items-start gap-3 text-sm">
                  <CheckIcon className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <div className="flex items-center gap-1">
                    <Label>{tier.creditsPerMonth}</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-gray-400 hover:text-gray-600 cursor-help transition-colors" />
                      </TooltipTrigger>
                      <TooltipContent
                        className="bg-white border-0 shadow-xl rounded-xl p-0 max-w-xs"
                        side="top"
                        sideOffset={12}
                      >
                        <div className="p-5">
                          <div className="font-semibold text-gray-800 mb-4 text-sm">
                            Credit usage
                          </div>
                          <div className="space-y-3">
                            <div className="flex justify-between space-x-2 items-center">
                              <span className="text-sm text-gray-700">
                                Lead import
                              </span>
                              <span className="text-sm font-medium text-blue-600">
                                1 credits
                              </span>
                            </div>
                            <div className="flex justify-between space-x-2 items-center">
                              <span className="text-sm text-gray-700">
                                Enrichment
                              </span>
                              <span className="text-sm font-medium text-blue-600">
                                5 credits
                              </span>
                            </div>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                {/* Lead limit section */}
                <div className="flex items-start gap-3 text-sm">
                  <CheckIcon className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <Label>{tier.leadLimit}</Label>
                </div>

                <Separator />

                {/* Key features section */}
                <div className="space-y-4">
                  <Label className="font-semibold text-sm uppercase text-muted-foreground">
                    {tier.plan === 'PRO'
                      ? 'Everything in Essentials, plus:'
                      : tier.plan === 'ENTERPRISE'
                        ? 'Everything in Pro, plus:'
                        : 'Key features:'}
                  </Label>
                  <div className="space-y-3">
                    {tier.features.map((feature) => (
                      <div
                        key={feature}
                        className="flex items-start gap-3 text-sm"
                      >
                        <CheckIcon className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <div className="flex items-center gap-1">
                          <Label>{feature}</Label>
                          {feature ===
                            'Complete business intelligence enrichment' && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3 w-3 text-gray-400 hover:text-gray-600 cursor-help transition-colors" />
                              </TooltipTrigger>
                              <TooltipContent
                                className="bg-white border-0 shadow-xl rounded-xl p-0 max-w-xs"
                                side="top"
                                sideOffset={12}
                              >
                                <div className="p-5">
                                  <div className="font-semibold text-gray-800 mb-4 text-sm">
                                    Enrichment
                                  </div>
                                  <div className="space-y-2 text-xs text-gray-600 leading-relaxed">
                                    <div>
                                      AI-powered business analysis (products,
                                      services, market positioning)
                                    </div>
                                    <div>All verified email contacts</div>
                                    <div>
                                      Social media profiles (LinkedIn, Facebook,
                                      Instagram)
                                    </div>
                                    <div>Website registration data</div>
                                    <div>
                                      Legal, juridical & financial data for
                                      European companies (incoming)
                                    </div>
                                    <div>
                                      Owner contact information (incoming)
                                    </div>
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>

              {/* Fixed footer aligned at bottom */}
              <CardFooter className="flex-col space-y-4 mt-auto">
                {/* CTA Button */}
                <Button
                  variant={tier.isPopular ? 'default' : 'outline'}
                  className="w-full"
                  asChild
                >
                  <Link
                    to="/checkout"
                    search={{
                      plan: tier.plan,
                      billingInterval: billingPeriod,
                      currency: currency,
                    }}
                    className="flex items-center justify-center"
                  >
                    {getPlanAction(tier.plan)}
                    <ArrowRightIcon className="ml-2 h-4 w-4" />
                  </Link>
                </Button>

                {/* No credit card required text */}
                {!hasActiveSubscription && (
                  <p className="text-xs text-muted-foreground text-center">
                    No credit card required
                  </p>
                )}
              </CardFooter>
            </Card>
          )
        })}
      </div>
    </TooltipProvider>
  )
}
