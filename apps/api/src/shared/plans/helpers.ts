import type { Plan, SearchModel } from '../enums'
import type {
  BillingPeriod,
  Currency,
  PlanConfig,
  PlanFeatures,
} from './config'
import { ALL_PLANS, PLAN_CONFIGS, PLAN_HIERARCHY } from './config'

/**
 * Get complete configuration for a plan
 */
export const getPlanConfig = (plan: Plan): PlanConfig => {
  return PLAN_CONFIGS[plan]
}

/**
 * Get hierarchy level for a plan (higher = more advanced)
 */
export const getPlanHierarchy = (plan: Plan): number => {
  return PLAN_HIERARCHY[plan]
}

/**
 * Check if user can upgrade from current plan to target plan
 */
export const canUpgradeTo = (currentPlan: Plan, targetPlan: Plan): boolean => {
  return getPlanHierarchy(targetPlan) > getPlanHierarchy(currentPlan)
}

/**
 * Check if user would be downgrading from current plan to target plan
 */
export const isDowngrade = (currentPlan: Plan, targetPlan: Plan): boolean => {
  return getPlanHierarchy(targetPlan) < getPlanHierarchy(currentPlan)
}

/**
 * Get price for a specific plan, currency, and billing period
 */
export const getPlanPrice = (
  plan: Plan,
  currency: Currency,
  period: BillingPeriod,
): number => {
  return PLAN_CONFIGS[plan].pricing[currency][period]
}

/**
 * Get all features for a plan
 */
export const getPlanFeatures = (plan: Plan): PlanFeatures => {
  return PLAN_CONFIGS[plan].features
}

/**
 * Check if a plan has a specific feature
 */
export const hasFeature = (
  plan: Plan,
  feature: keyof PlanFeatures,
): boolean => {
  return PLAN_CONFIGS[plan].features[feature]
}

/**
 * Get credit allocation for a plan
 */
export const getPlanCredits = (plan: Plan): number => {
  return PLAN_CONFIGS[plan].credits
}

/**
 * Get rate limits for a plan
 */
export const getPlanRateLimit = (plan: Plan): { perMinute: number } => {
  return PLAN_CONFIGS[plan].rateLimit
}

/**
 * Get concurrency limit for a plan
 */
export const getPlanConcurrency = (plan: Plan): number => {
  return PLAN_CONFIGS[plan].concurrency
}

/**
 * Get lead limit for a plan
 */
export const getPlanLeadLimit = (plan: Plan): number => {
  return PLAN_CONFIGS[plan].leadLimit
}

/**
 * Get search model for a plan
 */
export const getPlanSearchModel = (plan: Plan): SearchModel => {
  return PLAN_CONFIGS[plan].searchModel
}

/**
 * Get all plans sorted by hierarchy
 */
export const getAllPlans = (): Plan[] => {
  return [...ALL_PLANS]
}

/**
 * Get plans available for subscription (exclude FREE)
 */
export const getSubscribablePlans = (): Plan[] => {
  return ALL_PLANS.filter((plan) => plan !== 'FREE')
}

/**
 * Calculate monthly equivalent price for quarterly/yearly plans
 */
export const getMonthlyEquivalentPrice = (
  plan: Plan,
  currency: Currency,
  period: BillingPeriod,
): number => {
  const price = getPlanPrice(plan, currency, period)

  switch (period) {
    case 'monthly':
      return price
    case 'quarterly':
      return Math.round((price / 3) * 100) / 100
    case 'yearly':
      return Math.round((price / 12) * 100) / 100
  }
}

/**
 * Calculate savings percentage for quarterly/yearly vs monthly
 */
export const getSavingsPercentage = (
  plan: Plan,
  currency: Currency,
  period: BillingPeriod,
): number => {
  if (period === 'monthly') return 0

  const monthlyPrice = getPlanPrice(plan, currency, 'monthly')
  const monthlyEquivalent = getMonthlyEquivalentPrice(plan, currency, period)

  return Math.round(((monthlyPrice - monthlyEquivalent) / monthlyPrice) * 100)
}
