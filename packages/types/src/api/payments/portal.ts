import { z } from 'zod'
import { ApiErrorResponseSchema } from '../../common'

export const CreatePortalSessionResponseSchema = z.object({
  url: z.string(),
})

export const CreatePortalSessionApiResponseSchema = z.union([
  CreatePortalSessionResponseSchema,
  ApiErrorResponseSchema,
])

export type CreatePortalSessionResponse = z.infer<
  typeof CreatePortalSessionResponseSchema
>
export type CreatePortalSessionApiResponse = z.infer<
  typeof CreatePortalSessionApiResponseSchema
>
