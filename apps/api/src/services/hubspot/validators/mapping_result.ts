import {
  CompanyFieldEnum,
  ContactFieldEnum,
  StatusFieldEnum,
} from '@ritchy/types'
import { z } from 'zod'

export const MappingResultSchema = z.object({
  hubspotTokenId: z.string(),
  internalField: z.union([ContactFieldEnum, CompanyFieldEnum, StatusFieldEnum]),
  hubspotField: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type MappingResult = z.infer<typeof MappingResultSchema>
