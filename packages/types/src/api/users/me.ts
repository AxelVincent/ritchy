import { z } from 'zod'
import { ApiErrorResponseSchema } from '../../common'
import { PlanEnum } from '../payments/checkout'

export const UserMeDataSchema = z.object({
  plan: PlanEnum,
  isDemoValidated: z.boolean(),
})

export const UserMeApiResponseSchema = z.union([
  UserMeDataSchema,
  ApiErrorResponseSchema,
])

export type UserMeData = z.infer<typeof UserMeDataSchema>
export type UserMeApiResponse = z.infer<typeof UserMeApiResponseSchema>
