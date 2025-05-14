import { z } from 'zod'
import { ApiErrorResponseSchema } from '../../common'
import { SubscriptionPlanEnum } from './subscriptions'

// Schema for the successful response data of the /users/me endpoint
export const UserMeDataSchema = z.object({
  plan: SubscriptionPlanEnum,
  isDemoValidated: z.boolean(),
})

// Schema for the overall API response for /users/me (either success or an API error)
export const UserMeApiResponseSchema = z.union([
  UserMeDataSchema,
  ApiErrorResponseSchema,
])

// Type Inferences for easier usage in TypeScript
export type UserMeData = z.infer<typeof UserMeDataSchema>
export type UserMeApiResponse = z.infer<typeof UserMeApiResponseSchema>
