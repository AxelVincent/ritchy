import { z } from 'zod'
import { ApiErrorResponseSchema } from '../../common'
import { PlanEnum } from '../payments/checkout'

export const UserMeDataSchema = z.object({
  plan: PlanEnum,
  credits: z.object({
    plan: z.number(),
    credits: z.number(),
  }),
  nextRenewalDate: z.string().datetime().nullable(),
})

export const UserMeApiResponseSchema = z.union([
  UserMeDataSchema,
  ApiErrorResponseSchema,
])

export type UserMeData = z.infer<typeof UserMeDataSchema>
export type UserMeApiResponse = z.infer<typeof UserMeApiResponseSchema>
