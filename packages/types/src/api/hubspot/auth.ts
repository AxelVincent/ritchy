import { z } from 'zod'

export const HubspotStatusSchema = z.object({
  connected: z.boolean(),
  scopes: z.array(z.string()),
  expiresAt: z.number().optional(),
  authUrl: z.string().optional(),
})

export const HubspotConnectUrlResponseSchema = z.object({
  authUrl: z.string(),
})

export type HubspotStatus = z.infer<typeof HubspotStatusSchema>
export type HubspotConnectUrlResponse = z.infer<
  typeof HubspotConnectUrlResponseSchema
>
