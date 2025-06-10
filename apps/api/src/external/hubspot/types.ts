import { z } from 'zod'

export type PlaceCompanyMapping = {
  placeId: string
  hubspotCompanyId: string
  placeName: string | unknown
}

export const HubspotBaseSchema = z.object({
  id: z.string(),
  properties: z.record(z.string(), z.unknown()),
  createdAt: z
    .union([z.string(), z.date()])
    .transform((val) => (val instanceof Date ? val.toISOString() : val)),
  updatedAt: z
    .union([z.string(), z.date()])
    .transform((val) => (val instanceof Date ? val.toISOString() : val)),
  archived: z.boolean(),
})

export type HubspotBase = z.infer<typeof HubspotBaseSchema>
