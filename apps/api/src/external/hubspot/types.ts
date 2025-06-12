import { z } from 'zod'

const HubspotBaseSchema = z.object({
  id: z.string(),
  placeId: z.string(),
  properties: z.record(z.string(), z.unknown()),
  createdAt: z
    .union([z.string(), z.date()])
    .transform((val) => (val instanceof Date ? val.toISOString() : val)),
  updatedAt: z
    .union([z.string(), z.date()])
    .transform((val) => (val instanceof Date ? val.toISOString() : val)),
  archived: z.boolean(),
})

const BatchOperationSchema = z.object({
  placeId: z.string(),
  id: z.string().optional(),
  properties: z.record(z.string()),
})

export type HubspotBase = z.infer<typeof HubspotBaseSchema>
export type BatchOperation = z.infer<typeof BatchOperationSchema>
export type EntityType = 'contacts' | 'companies'

export type LeadMapping = {
  placeId: string
  hubspotCompanyId: string
  hubspotContactId: string | null
  tokenId: string
  createdAt: Date
  updatedAt: Date
}
