import { z } from 'zod'
import { ApiErrorResponseSchema, PlanEnum } from '../../../shared'

// Response schema (success)
export const UserMeDataSchema = z.object({
  plan: PlanEnum,
  credits: z.object({
    plan: z.number(),
    credits: z.number(),
  }),
  nextRenewalDate: z.string().datetime().nullable(),
})

// API response (success | error)
export const UserMeApiResponseSchema = z.union([
  UserMeDataSchema,
  ApiErrorResponseSchema,
])

// Inferred types
export type Plan = z.infer<typeof PlanEnum>
export type UserMeData = z.infer<typeof UserMeDataSchema>
export type UserMeApiResponse = z.infer<typeof UserMeApiResponseSchema>
