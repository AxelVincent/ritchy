import { z } from 'zod'

export const ApiErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  details: z
    .array(
      z.object({
        code: z.string(),
        message: z.string(),
        path: z.array(z.string().or(z.number())),
      }),
    )
    .optional(),
})

export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>
