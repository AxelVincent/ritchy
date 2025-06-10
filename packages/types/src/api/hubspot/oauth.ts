import { z } from 'zod'
import { ApiErrorResponseSchema } from '../../common'

// Request schemas
export const OAuthCallbackBodySchema = z.object({
  code: z.string().optional(),
  state: z.string(),
  error: z.string().optional(),
})

// Response schemas
export const OAuthConnectUrlResponseSchema = z.union([
  z.object({
    authUrl: z.string(),
  }),
  ApiErrorResponseSchema,
])

export const OAuthStatusResponseSchema = z.union([
  z.object({
    connected: z.boolean(),
  }),
  ApiErrorResponseSchema,
])

export const OAuthDisconnectResponseSchema = z.union([
  z.object({
    success: z.boolean(),
  }),
  ApiErrorResponseSchema,
])

// Types
export type OAuthCallbackBody = z.infer<typeof OAuthCallbackBodySchema>
export type OAuthConnectUrlResponse = z.infer<
  typeof OAuthConnectUrlResponseSchema
>
export type OAuthStatusResponse = z.infer<typeof OAuthStatusResponseSchema>
export type OAuthDisconnectResponse = z.infer<
  typeof OAuthDisconnectResponseSchema
>
