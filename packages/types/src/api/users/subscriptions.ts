import { z } from 'zod'
import { ApiErrorResponseSchema } from '../../common'

// Match the database enum exactly
export const SubscriptionPlanEnum = z.enum([
  'FREE',
  'EXPLORER',
  'NAVIGATOR',
  'PRO',
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
