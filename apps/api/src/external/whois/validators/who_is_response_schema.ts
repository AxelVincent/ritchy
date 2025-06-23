import { z } from 'zod'

export const WhoisResponseSchema = z
  .object({
    creationDate: z.string().optional(),
    created: z.string().optional(),
    registered: z.string().optional(),
    registrationDate: z.string().optional(),
    registrar: z.string().optional(),
    sponsoringRegistrar: z.string().optional(),
    registrationServiceProvider: z.string().optional(),
    adminName: z.string().optional(),
  })
  .passthrough()
