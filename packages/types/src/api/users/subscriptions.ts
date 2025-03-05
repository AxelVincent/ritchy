import { z } from 'zod'
import { ApiErrorResponseSchema } from '../../common'

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

export const UserSubscriptionResponseSchema = z.object({
  plan: SubscriptionPlanEnum,
})

export const UserSubscriptionApiResponseSchema = z.union([
  UserSubscriptionResponseSchema,
  ApiErrorResponseSchema,
])

// Type Inferences
export type SubscriptionPlan = z.infer<typeof SubscriptionPlanEnum>
export type Subscription = z.infer<typeof UserSubscriptionResponseSchema>
export type UserSubscriptionApiResponse = z.infer<
  typeof UserSubscriptionApiResponseSchema
>
