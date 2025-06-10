import { z } from 'zod'
import { ApiErrorResponseSchema } from '../../common'
import { HubspotPropertySchema } from './properties'

// Company mappings
export const CompanyFieldEnum = z.enum([
  'company.name',
  'company.website',
  'company.country',
  'company.postalCode',
  'company.street',
  'company.locality',
  'company.region',
  'company.phone',
])

// Add new status field enum
export const StatusFieldEnum = z.enum([
  'status.NEW',
  'status.NO_ANSWER',
  'status.CONTACTED',
  'status.FOLLOW_UP',
  'status.MEETING',
  'status.INTERESTED',
  'status.WON',
  'status.LOST',
])

// Update ContactFieldEnum to remove status fields
export const ContactFieldEnum = z.enum([
  'contact.firstname',
  'contact.lastname',
  'contact.email',
  'contact.phone',
])

// Our internal lead statuses
export const InternalLeadStatusEnum = z.enum([
  'NEW',
  'NO_ANSWER',
  'CONTACTED',
  'FOLLOW_UP',
  'MEETING',
  'INTERESTED',
  'WON',
  'LOST',
])

// HubSpot's lead status fields
export const HubspotLeadStatusEnum = z.enum([
  'NEW',
  'OPEN',
  'IN_PROGRESS',
  'OPEN_DEAL',
  'UNQUALIFIED',
  'ATTEMPTED_TO_CONTACT',
  'CONNECTED',
  'BAD_TIMING',
])

// Define the mapping directly from internal to HubSpot status
export const LEAD_STATUS_MAPPING: Record<
  z.infer<typeof InternalLeadStatusEnum>,
  z.infer<typeof HubspotLeadStatusEnum>
> = {
  NEW: 'NEW',
  NO_ANSWER: 'BAD_TIMING',
  CONTACTED: 'ATTEMPTED_TO_CONTACT',
  FOLLOW_UP: 'IN_PROGRESS',
  MEETING: 'CONNECTED',
  INTERESTED: 'OPEN',
  WON: 'OPEN_DEAL',
  LOST: 'UNQUALIFIED',
} as const

// Simple display names for HubSpot fields
export const HUBSPOT_STATUS_DISPLAY_NAMES: Record<
  z.infer<typeof HubspotLeadStatusEnum>,
  string
> = {
  NEW: 'New',
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  OPEN_DEAL: 'Open Deal',
  UNQUALIFIED: 'Unqualified',
  ATTEMPTED_TO_CONTACT: 'Attempted to Contact',
  CONNECTED: 'Connected',
  BAD_TIMING: 'Bad Timing',
} as const

// Define the field configuration schema
export const FieldConfigSchema = z.object({
  displayName: z.string(),
  description: z.string().optional(),
  defaultHubspotField: z.string(),
  required: z.boolean().default(false),
  type: z.enum(['text', 'url', 'phone', 'address']).default('text'),
})

export type FieldConfig = z.infer<typeof FieldConfigSchema>

// Derive types from enums
export type CompanyField = z.infer<typeof CompanyFieldEnum>
export type ContactField = z.infer<typeof ContactFieldEnum>

// Update FieldConfigs type
type FieldConfigs = {
  company: {
    [K in CompanyField as K extends `company.${infer F}`
      ? F
      : never]: FieldConfig
  }
  contact: {
    [K in ContactField as K extends `contact.${infer F}`
      ? F
      : never]: FieldConfig
  }
  status: {
    [K in StatusField as K extends `status.${infer S}` ? S : never]: FieldConfig
  }
}

// Update FIELD_CONFIGS
export const FIELD_CONFIGS: FieldConfigs = {
  company: {
    name: {
      displayName: 'Company Name',
      description: 'The legal name of the company',
      defaultHubspotField: 'name',
      required: false,
      type: 'text',
    },
    website: {
      displayName: 'Website',
      description: 'The company website URL',
      defaultHubspotField: 'website',
      required: false,
      type: 'url',
    },
    country: {
      displayName: 'Country',
      description: 'The country where the company is located',
      defaultHubspotField: 'country',
      required: false,
      type: 'text',
    },
    postalCode: {
      displayName: 'Postal Code',
      description: 'The postal code of the company address',
      defaultHubspotField: 'zip',
      required: false,
      type: 'text',
    },
    street: {
      displayName: 'Street Address',
      description: 'The street address of the company',
      defaultHubspotField: 'address',
      required: false,
      type: 'text',
    },
    locality: {
      displayName: 'City',
      description: 'The city where the company is located',
      defaultHubspotField: 'city',
      required: false,
      type: 'text',
    },
    region: {
      displayName: 'State/Region',
      description: 'The state or region where the company is located',
      defaultHubspotField: 'state',
      required: false,
      type: 'text',
    },
    phone: {
      displayName: 'Phone Number',
      description: 'The company phone number',
      defaultHubspotField: 'phone',
      required: false,
      type: 'phone',
    },
  },
  contact: {
    firstname: {
      displayName: 'First Name',
      description: 'The first name of the contact',
      defaultHubspotField: 'firstname',
      required: false,
      type: 'text',
    },
    lastname: {
      displayName: 'Last Name',
      description: 'The last name of the contact',
      defaultHubspotField: 'lastname',
      required: false,
      type: 'text',
    },
    email: {
      displayName: 'Email',
      description: 'The email address of the contact',
      defaultHubspotField: 'email',
      required: false,
      type: 'text',
    },
    phone: {
      displayName: 'Phone Number',
      description: 'The phone number of the contact',
      defaultHubspotField: 'phone',
      required: false,
      type: 'phone',
    },
  },
  status: {
    NEW: {
      displayName: 'New Status',
      description: 'Contact is new',
      defaultHubspotField: LEAD_STATUS_MAPPING.NEW,
      required: false,
      type: 'text',
    },
    NO_ANSWER: {
      displayName: 'No Answer Status',
      description: 'Contact has not answered',
      defaultHubspotField: LEAD_STATUS_MAPPING.NO_ANSWER,
      required: false,
      type: 'text',
    },
    CONTACTED: {
      displayName: 'Contacted Status',
      description: 'Contact has been contacted',
      defaultHubspotField: LEAD_STATUS_MAPPING.CONTACTED,
      required: false,
      type: 'text',
    },
    FOLLOW_UP: {
      displayName: 'Follow Up Status',
      description: 'Contact needs follow up',
      defaultHubspotField: LEAD_STATUS_MAPPING.FOLLOW_UP,
      required: false,
      type: 'text',
    },
    MEETING: {
      displayName: 'Meeting Status',
      description: 'Contact has a meeting scheduled',
      defaultHubspotField: LEAD_STATUS_MAPPING.MEETING,
      required: false,
      type: 'text',
    },
    INTERESTED: {
      displayName: 'Interested Status',
      description: 'Contact is interested',
      defaultHubspotField: LEAD_STATUS_MAPPING.INTERESTED,
      required: false,
      type: 'text',
    },
    WON: {
      displayName: 'Won Status',
      description: 'Contact has been won',
      defaultHubspotField: LEAD_STATUS_MAPPING.WON,
      required: false,
      type: 'text',
    },
    LOST: {
      displayName: 'Lost Status',
      description: 'Contact has been lost',
      defaultHubspotField: LEAD_STATUS_MAPPING.LOST,
      required: false,
      type: 'text',
    },
  },
}

// Generate DEFAULT_COMPANY_FIELDS from FIELD_CONFIGS
export const DEFAULT_COMPANY_FIELDS = Object.fromEntries(
  Object.entries(FIELD_CONFIGS.company).map(([field, config]) => [
    field,
    config.defaultHubspotField,
  ]),
) as Record<CompanyField, string>

// Generate DEFAULT_CONTACT_FIELDS from FIELD_CONFIGS
export const DEFAULT_CONTACT_FIELDS = Object.fromEntries(
  Object.entries(FIELD_CONFIGS.contact).map(([field, config]) => [
    field,
    (config as FieldConfig).defaultHubspotField,
  ]),
) as Record<ContactField, string>

// Mapping schemas
export const CompanyMappingSchema = z.object({
  id: z.string().uuid(),
  tokenId: z.string().uuid(),
  internalField: CompanyFieldEnum,
  hubspotField: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const ContactMappingSchema = z.object({
  id: z.string().uuid(),
  tokenId: z.string().uuid(),
  internalField: z.union([ContactFieldEnum, StatusFieldEnum]),
  hubspotField: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

// Request/Response schemas
export const UpdateCompanyMappingBodySchema = z.object({
  internalField: CompanyFieldEnum,
  hubspotField: z.string(),
})

export const UpdateContactMappingBodySchema = z.object({
  internalField: z.union([ContactFieldEnum, StatusFieldEnum]),
  hubspotField: z.string(),
})

// Response types with error handling
export const GetCompanyMappingsResponseSchema = z.union([
  z.array(CompanyMappingSchema),
  ApiErrorResponseSchema,
])

export const GetContactMappingsResponseSchema = z.union([
  z.array(ContactMappingSchema),
  ApiErrorResponseSchema,
])

export const UpdateCompanyMappingResponseSchema = z.union([
  CompanyMappingSchema,
  ApiErrorResponseSchema,
])

export const UpdateContactMappingResponseSchema = z.union([
  ContactMappingSchema,
  ApiErrorResponseSchema,
])

export const GetCompanyPropertiesResponseSchema = z.union([
  z.object({
    companyProperties: z.array(HubspotPropertySchema),
  }),
  ApiErrorResponseSchema,
])

export const GetContactPropertiesResponseSchema = z.union([
  z.object({
    contactProperties: z.array(HubspotPropertySchema),
  }),
  ApiErrorResponseSchema,
])

export const ResetMappingResponseSchema = z.union([
  z.object({ success: z.boolean() }),
  ApiErrorResponseSchema,
])

// Types
export type CompanyMapping = z.infer<typeof CompanyMappingSchema>
export type ContactMapping = z.infer<typeof ContactMappingSchema>
export type StatusField = z.infer<typeof StatusFieldEnum>
export type InternalField = CompanyField | ContactField | StatusField
export type UpdateCompanyMappingBody = z.infer<
  typeof UpdateCompanyMappingBodySchema
>
export type UpdateContactMappingBody = z.infer<
  typeof UpdateContactMappingBodySchema
>
export type ResetMappingResponse = z.infer<typeof ResetMappingResponseSchema>
export type GetCompanyMappingsResponse = z.infer<
  typeof GetCompanyMappingsResponseSchema
>
export type GetContactMappingsResponse = z.infer<
  typeof GetContactMappingsResponseSchema
>
export type UpdateCompanyMappingResponse = z.infer<
  typeof UpdateCompanyMappingResponseSchema
>
export type UpdateContactMappingResponse = z.infer<
  typeof UpdateContactMappingResponseSchema
>
export type GetCompanyPropertiesResponse = z.infer<
  typeof GetCompanyPropertiesResponseSchema
>
export type GetContactPropertiesResponse = z.infer<
  typeof GetContactPropertiesResponseSchema
>
export type InternalLeadStatus = z.infer<typeof InternalLeadStatusEnum>
export type HubspotLeadStatus = z.infer<typeof HubspotLeadStatusEnum>
export type LeadStatusMapping = typeof LEAD_STATUS_MAPPING
export type HubspotStatusConfig = typeof HUBSPOT_STATUS_DISPLAY_NAMES
export type HubspotStatusDisplayName =
  (typeof HUBSPOT_STATUS_DISPLAY_NAMES)[keyof typeof HUBSPOT_STATUS_DISPLAY_NAMES]
