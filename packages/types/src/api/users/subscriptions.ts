import { z } from 'zod'

export const PLAN_RADIUS_LIMITS = {
  FREE: 50000,
  ESSENTIALS: 50000,
  NAVIGATOR: 50000,
  EXPLORER: 100000,
  PRO: 150000,
} as const

// Match the database enum exactly
export const SubscriptionPlanEnum = z.enum([
  'FREE',
  'ESSENTIALS',
  'EXPLORER',
  'PRO',
  'NAVIGATOR',
])

export type SubscriptionPlan = z.infer<typeof SubscriptionPlanEnum>
