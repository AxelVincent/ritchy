import { useUserMe } from '@/api/queries/users/useUserMe'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  ALL_PLANS,
  type BillingPeriod,
  type Currency,
  PLAN_HIERARCHY,
  type Plan,
  getMonthlyEquivalentPrice,
  getPlanConfig,
  getPlanPrice,
  getSavingsPercentage,
} from '@api/shared'
import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  Code2,
  Copy,
  Rocket,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { useState } from 'react'

// Tier styling configuration
const TIER_STYLES: Record<string, { gradient: string; accent: string }> = {
  Rocket: {
    gradient:
      'from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900',
    accent: 'text-slate-600 dark:text-slate-400',
  },
  Zap: {
    gradient:
      'from-amber-100 to-amber-50 dark:from-amber-900 dark:to-amber-950',
    accent: 'text-amber-600 dark:text-amber-400',
  },
  TrendingUp: {
    gradient: 'from-blue-100 to-blue-50 dark:from-blue-900 dark:to-blue-950',
    accent: 'text-blue-600 dark:text-blue-400',
  },
  Search: {
    gradient:
      'from-emerald-100 to-emerald-50 dark:from-emerald-900 dark:to-emerald-950',
    accent: 'text-emerald-600 dark:text-emerald-400',
  },
  Target: {
    gradient:
      'from-violet-100 to-violet-50 dark:from-violet-900 dark:to-violet-950',
    accent: 'text-violet-600 dark:text-violet-400',
  },
  Building2: {
    gradient: 'from-rose-100 to-rose-50 dark:from-rose-900 dark:to-rose-950',
    accent: 'text-rose-600 dark:text-rose-400',
  },
}

// Icon components
const PLAN_ICONS: Record<string, React.ReactNode> = {
  Rocket: <Rocket className="h-4 w-4" />,
  Zap: <Zap className="h-4 w-4" />,
  TrendingUp: <TrendingUp className="h-4 w-4" />,
  Search: <Search className="h-4 w-4" />,
  Target: <Target className="h-4 w-4" />,
  Building2: <Building2 className="h-4 w-4" />,
}

// Feature labels
const FEATURE_LABELS: Record<string, string> = {
  visualTerritoryManagement: 'Visual territory management',
  businessEnrichment: 'Business enrichment',
  emailVerifier: 'Email verifier',
  prospectPipeline: 'Prospect pipeline',
  notesTracking: 'Notes & tracking',
  csvExport: 'CSV Export',
  emailSupport: 'Email support',
  repeatSearch: 'Repeat search',
  personalizedLists: 'Personalised lists',
  teamCollaboration: 'Team collaboration',
  zapierIntegration: 'Zapier integration',
  onboardingSession: 'Onboarding session',
  dedicatedSupport: 'Dedicated support',
  customLimits: 'Custom limits',
  playbook: 'Playbook included',
  accountManager: 'Account manager',
  apiAccess: 'API access',
  priorityEmailSupport: 'Priority email support',
  whatsAppSupport: 'WhatsApp support',
  slackChannel: 'Dedicated Slack channel',
}

// Get incremental features
const getDisplayFeatures = (plan: Plan, planIndex: number): string[] => {
  const config = getPlanConfig(plan)
  const enabledFeatures = Object.entries(config.features)
    .filter(([_, enabled]) => enabled)
    .map(([key]) => FEATURE_LABELS[key])
    .filter((label): label is string => !!label)

  if (planIndex === 0) return enabledFeatures

  const previousPlan = ALL_PLANS[planIndex - 1]
  if (!previousPlan) return enabledFeatures

  const previousConfig = getPlanConfig(previousPlan)
  const previousFeatures = Object.entries(previousConfig.features)
    .filter(([_, enabled]) => enabled)
    .map(([key]) => FEATURE_LABELS[key])
    .filter((label): label is string => !!label)

  return enabledFeatures.filter((f) => !previousFeatures.includes(f))
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
  billingPeriod: BillingPeriod
  activePromos?: PromoOffer[]
  annualOffer?: AnnualOffer
  currency?: Currency
  onCurrencyChange?: (currency: Currency) => void
}

export const PricingCards = ({
  billingPeriod,
  activePromos = [],
  currency = 'usd',
}: PricingCardsProps) => {
  const { data: me } = useUserMe()
  const [copiedPromo, setCopiedPromo] = useState<string | null>(null)
  const [openApiDetails, setOpenApiDetails] = useState<string | null>(null)

  const currencySymbol = currency === 'eur' ? '€' : '$'
  const hasActiveSubscription = me?.plan && me.plan !== 'FREE'
  const currentPlan = me?.plan as Plan | undefined

  const getPlanAction = (tierPlan: Plan) => {
    if (tierPlan === 'FREE') return 'Free forever'
    if (!hasActiveSubscription) return 'Get started'

    const currentPlanLevel = PLAN_HIERARCHY[currentPlan as Plan] || 0
    const tierPlanLevel = PLAN_HIERARCHY[tierPlan] || 0

    if (tierPlanLevel > currentPlanLevel) return 'Upgrade'
    if (tierPlanLevel < currentPlanLevel) return 'Downgrade'
    return 'Current plan'
  }

  const copyPromoCode = (code: string) => {
    navigator.clipboard
      .writeText(code)
      .then(() => {
        setCopiedPromo(code)
        toast({ title: `Promo code ${code} copied!` })
        setTimeout(() => setCopiedPromo(null), 2000)
      })
      .catch(() => {
        toast({ title: 'Failed to copy promo code' })
      })
  }

  const getFeatureSectionTitle = (planIndex: number): string => {
    if (planIndex === 0) return 'Includes'
    const previousPlan = ALL_PLANS[planIndex - 1]
    if (!previousPlan) return 'Includes'
    const previousConfig = getPlanConfig(previousPlan)
    return `${previousConfig.displayName} +`
  }

  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 max-w-[1400px] mx-auto pt-4">
        {ALL_PLANS.map((planId, planIndex) => {
          const config = getPlanConfig(planId)
          const tierStyle = TIER_STYLES[config.icon]
          const isFree = planId === 'FREE'
          const isCurrentPlan = currentPlan === planId
          const isPopular = config.popular

          const applicablePromo = activePromos.find(
            (promo) => promo.planId === planId,
          )
          const hasPromo = !!applicablePromo && !isFree

          const currentPrice = getPlanPrice(planId, currency, billingPeriod)
          const finalPrice = hasPromo
            ? Math.round(currentPrice * (1 - applicablePromo.discount / 100))
            : currentPrice

          const monthlyEquivalent =
            billingPeriod !== 'monthly' && !isFree
              ? getMonthlyEquivalentPrice(planId, currency, billingPeriod)
              : null

          const savingsPercentage =
            billingPeriod !== 'monthly' && !isFree
              ? getSavingsPercentage(planId, currency, billingPeriod)
              : null

          const displayFeatures = getDisplayFeatures(planId, planIndex)

          return (
            <div
              key={config.name}
              className={cn(
                'relative flex flex-col rounded-xl border bg-card transition-all duration-200',
                isCurrentPlan
                  ? 'border-emerald-300 dark:border-emerald-700 ring-1 ring-emerald-200 dark:ring-emerald-800'
                  : isPopular && !hasActiveSubscription
                    ? 'border-blue-300 dark:border-blue-700 shadow-lg shadow-blue-500/20 ring-1 ring-blue-200 dark:ring-blue-800'
                    : 'border-border hover:shadow-md hover:border-border/80',
              )}
            >
              {/* Badge container */}
              <div className="h-0 relative">
                {isPopular && !hasActiveSubscription && (
                  <div className="absolute -top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                    <Badge className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0 shadow-md text-xs px-2.5 py-0.5">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Popular
                    </Badge>
                  </div>
                )}
                {isCurrentPlan && (
                  <div className="absolute -top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                    <Badge
                      variant="outline"
                      className="bg-emerald-50 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 text-xs px-2.5 py-0.5"
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Current
                    </Badge>
                  </div>
                )}
              </div>

              {/* Header with gradient */}
              <div
                className={cn(
                  'p-4 bg-gradient-to-br rounded-t-xl',
                  tierStyle.gradient,
                )}
              >
                {/* Promo badge */}
                {hasPromo && (
                  <button
                    type="button"
                    onClick={() => copyPromoCode(applicablePromo.code)}
                    className="absolute top-2 right-2 z-10"
                  >
                    <Badge
                      variant="secondary"
                      className="bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 text-xs cursor-pointer hover:bg-amber-200 transition-colors"
                    >
                      {copiedPromo === applicablePromo.code ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <>
                          <Copy className="h-3 w-3 mr-1" />
                          {applicablePromo.discount}%
                        </>
                      )}
                    </Badge>
                  </button>
                )}

                {/* Plan name */}
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={tierStyle.accent}>
                    {PLAN_ICONS[config.icon]}
                  </span>
                  <h3 className="font-semibold text-base">
                    {config.displayName}
                  </h3>
                </div>

                {/* Tagline */}
                <p className="text-xs text-muted-foreground h-8 line-clamp-2">
                  {config.tagline}
                </p>

                {/* Price section */}
                <div className="h-16 flex flex-col justify-end">
                  {savingsPercentage && savingsPercentage > 0 && (
                    <Badge
                      variant="secondary"
                      className="w-fit bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border-0 text-[10px] px-1.5 py-0 mb-1"
                    >
                      Save {savingsPercentage}%
                    </Badge>
                  )}
                  <div className="flex items-baseline gap-0.5">
                    {hasPromo && (
                      <span className="text-sm line-through text-muted-foreground mr-1">
                        {currencySymbol}
                        {currentPrice}
                      </span>
                    )}
                    <span className="text-2xl font-bold tracking-tight">
                      {isFree ? 'Free' : `${currencySymbol}${finalPrice}`}
                    </span>
                    {!isFree && (
                      <span className="text-xs text-muted-foreground">
                        /
                        {billingPeriod === 'monthly'
                          ? 'mo'
                          : billingPeriod === 'quarterly'
                            ? 'qtr'
                            : 'yr'}
                      </span>
                    )}
                  </div>
                  {monthlyEquivalent ? (
                    <p className="text-[10px] text-muted-foreground">
                      ~{currencySymbol}
                      {monthlyEquivalent}/month
                    </p>
                  ) : (
                    <p className="text-[10px] text-muted-foreground">&nbsp;</p>
                  )}
                </div>
              </div>

              {/* Stats section */}
              <div className="p-4 space-y-2 border-b border-border/50">
                <StatRow
                  label="Credits"
                  value={config.credits.toLocaleString()}
                  tooltip={
                    <div className="space-y-2">
                      <p className="font-medium">Credit usage</p>
                      <div className="space-y-1">
                        <div className="flex justify-between gap-6">
                          <span className="text-muted-foreground">
                            Lead import
                          </span>
                          <span className="font-medium">1</span>
                        </div>
                        <div className="flex justify-between gap-6">
                          <span className="text-muted-foreground">
                            Company enrichment
                          </span>
                          <span className="font-medium">1</span>
                        </div>
                        <div className="flex justify-between gap-6">
                          <span className="text-muted-foreground">
                            Contact enrichment
                          </span>
                          <span className="font-medium">5</span>
                        </div>
                      </div>
                    </div>
                  }
                />
                <StatRow
                  label="Leads"
                  value={config.leadLimit.toLocaleString()}
                  tooltip="Maximum leads in your CRM"
                />

                {/* API limits - Collapsible */}
                <Collapsible
                  open={openApiDetails === planId}
                  onOpenChange={(open) =>
                    setOpenApiDetails(open ? planId : null)
                  }
                >
                  <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full py-0.5">
                    <Code2 className="h-3 w-3" />
                    <span>API limits</span>
                    <ChevronDown
                      className={cn(
                        'h-3 w-3 ml-auto transition-transform',
                        openApiDetails === planId && 'rotate-180',
                      )}
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Rate limit</span>
                      <span className="font-medium tabular-nums">
                        {config.rateLimit.perMinute}/min
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Concurrency</span>
                      <span className="font-medium tabular-nums">
                        {config.concurrency}
                      </span>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>

              {/* Features section */}
              <div className="flex-1 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  {getFeatureSectionTitle(planIndex)}
                </p>
                <ul className="space-y-1.5">
                  {displayFeatures.map((feature) => (
                    <li key={feature} className="flex items-start gap-1.5">
                      <Check className="h-3.5 w-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span className="text-xs text-muted-foreground leading-tight">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Footer */}
              <div className="p-4 pt-0 mt-auto">
                {isFree ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled
                  >
                    Free forever
                  </Button>
                ) : isCurrentPlan ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled
                  >
                    Current plan
                  </Button>
                ) : (
                  <Button
                    variant={
                      isPopular && !hasActiveSubscription
                        ? 'default'
                        : 'outline'
                    }
                    size="sm"
                    className={cn(
                      'w-full',
                      isPopular &&
                        !hasActiveSubscription &&
                        'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 border-0',
                    )}
                    asChild
                  >
                    <Link
                      to="/checkout"
                      search={{
                        plan: planId,
                        billingInterval: billingPeriod,
                        currency: currency,
                      }}
                    >
                      {getPlanAction(planId)}
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </TooltipProvider>
  )
}

// Stat row component
const StatRow = ({
  label,
  value,
  tooltip,
}: {
  label: string
  value: string
  tooltip: React.ReactNode
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <div className="flex items-center justify-between cursor-help hover:bg-muted/50 -mx-1 px-1 py-0.5 rounded transition-colors">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-medium tabular-nums">{value}</span>
      </div>
    </TooltipTrigger>
    <TooltipContent
      side="top"
      className="bg-popover text-popover-foreground border shadow-md text-xs"
    >
      {tooltip}
    </TooltipContent>
  </Tooltip>
)
