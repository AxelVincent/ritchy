import { ALL_PLANS, PLAN_CONFIGS } from '../../shared/plans'

// Credit config derived from centralized plan configuration
// Re-export in this format for backward compatibility
export const CREDIT_CONFIG = ALL_PLANS.map((plan) => ({
  plan,
  credits: PLAN_CONFIGS[plan].credits,
}))
