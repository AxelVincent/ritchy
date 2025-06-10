import { z } from 'zod'

export const HubspotPropertySchema = z.object({
  name: z.string(),
  label: z.string(),
  type: z.string(),
  fieldType: z.string(),
  description: z.string().optional(),
  groupName: z.string(),
  options: z
    .array(
      z.object({
        label: z.string(),
        value: z.string(),
      }),
    )
    .optional(),
  hubspotDefined: z.boolean(),
  calculated: z.boolean(),
  hasUniqueValue: z.boolean(),
  archived: z.boolean(),
})

export const HubspotPropertyWithTypeSchema = HubspotPropertySchema.extend({
  objectType: z.enum(['company', 'contact']),
})

export const HubspotPropertiesResponseSchema = z.object({
  companyProperties: z.array(HubspotPropertyWithTypeSchema),
  contactProperties: z.array(HubspotPropertyWithTypeSchema),
  groupedProperties: z.record(z.array(HubspotPropertyWithTypeSchema)),
})

export type HubspotProperty = z.infer<typeof HubspotPropertySchema>
export type HubspotPropertyWithType = z.infer<
  typeof HubspotPropertyWithTypeSchema
>
export type HubspotPropertiesResponse = z.infer<
  typeof HubspotPropertiesResponseSchema
>
