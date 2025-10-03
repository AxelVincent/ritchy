import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core'
import { pgTable, uuid } from 'drizzle-orm/pg-core'
import type {
  FinancialRatios,
  RelatedDocument,
} from '../../external/pappers/international_company_v1'
import { emailQualityEnum, emailResultEnum, phoneTypeEnum } from './enum'
import { place } from './place'

export const enrichment = pgTable(
  'enrichment',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    placeId: uuid('place_id')
      .notNull()
      .references(() => place.id, { onDelete: 'cascade' })
      .unique(),
    description: text('description'),
    shortDescription: text('short_description'),
    domain: text('domain'),
    domainRegisteredAt: timestamp('domain_registered_at'),
    title: text('title'),
    language: text('language'),
    keywords: text('keywords'),
    favicon: text('favicon'),
    robots: text('robots'),
    success: boolean('success').notNull().default(false),
    error: text('error'),
    isStale: boolean('is_stale').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [index().on(table.isStale)],
)

export const enrichmentFacebook = pgTable(
  'enrichment_facebook',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    enrichmentId: uuid('enrichment_id')
      .notNull()
      .references(() => enrichment.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    source: text('source'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [unique().on(table.enrichmentId, table.url)],
)

export const enrichmentInstagram = pgTable(
  'enrichment_instagram',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    enrichmentId: uuid('enrichment_id')
      .notNull()
      .references(() => enrichment.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    source: text('source'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [unique().on(table.enrichmentId, table.url)],
)

export const enrichmentLinkedin = pgTable(
  'enrichment_linkedin',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    enrichmentId: uuid('enrichment_id')
      .notNull()
      .references(() => enrichment.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    source: text('source'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [unique().on(table.enrichmentId, table.url)],
)

export const enrichmentEmail = pgTable(
  'enrichment_email',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    enrichment_id: uuid('enrichment_id')
      .notNull()
      .references(() => enrichment.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    source: text('source'),
    quality: emailQualityEnum('quality'),
    result: emailResultEnum('result'),
    role: boolean('role').notNull().default(false),
    free: boolean('free').notNull().default(false),
    created_at: timestamp('created_at').notNull().defaultNow(),
    updated_at: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [unique().on(table.enrichment_id, table.email)],
)
export type EnrichmentEmail = typeof enrichmentEmail.$inferSelect

export const enrichmentPhone = pgTable(
  'enrichment_phone',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    enrichmentId: uuid('enrichment_id')
      .notNull()
      .references(() => enrichment.id, { onDelete: 'cascade' }),
    phone: text('phone').notNull(),
    type: phoneTypeEnum('type').notNull(),
    source: text('source'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [unique().on(table.enrichmentId, table.phone)],
)

export const enrichmentCompany = pgTable('enrichment_company', {
  id: uuid('id').defaultRandom().primaryKey(),
  enrichment_id: uuid('enrichment_id')
    .notNull()
    .references(() => enrichment.id, { onDelete: 'cascade' })
    .unique(),
  reasoning: text('reasoning'),
  confidence_score: integer('confidence_score'),
  // Core company identifiers
  company_number: text('company_number').notNull(),
  country_code: text('country_code').notNull(),
  country: text('country'),
  state: text('state'),
  lei: text('lei'),
  isin: text('isin'),
  vat_number: text('vat_number'),
  // Company names and branding
  name: text('name').notNull(),
  trade_name: text('trade_name'),
  acronym: text('acronym'),
  // Legal structure
  legal_form_code: text('legal_form_code'),
  local_legal_form_code: text('local_legal_form_code'),
  local_legal_form_name: text('local_legal_form_name'),
  type: text('type'),
  // Company status and dates
  status: text('status').notNull(),
  date_of_creation: timestamp('date_of_creation'),
  date_of_cessation: timestamp('date_of_cessation'),
  // Workforce information
  workforce: integer('workforce'),
  workforce_range: text('workforce_range'),
  // Head office address
  head_office_address_line_1: text('head_office_address_line_1'),
  head_office_address_line_2: text('head_office_address_line_2'),
  head_office_postal_code: text('head_office_postal_code'),
  head_office_city: text('head_office_city'),
  head_office_country: text('head_office_country'),
  head_office_country_code: text('head_office_country_code'),
  // Commercial register
  commercial_register_registration_status: text(
    'commercial_register_registration_status',
  ),
  commercial_register_registration_location: text(
    'commercial_register_registration_location',
  ),
  commercial_register_registration_date: timestamp(
    'commercial_register_registration_date',
  ),
  commercial_register_cessation_date: timestamp(
    'commercial_register_cessation_date',
  ),
  // Financial information
  share_capital: numeric('share_capital'),
  share_capital_currency: text('share_capital_currency'),
  fiscal_year_end: text('fiscal_year_end'),
  next_fiscal_year_end: text('next_fiscal_year_end'),
  fields_of_activity: text('fields_of_activity'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
})

export const enrichmentCompanyActivity = pgTable(
  'enrichment_company_activity',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    company_id: uuid('company_id')
      .notNull()
      .references(() => enrichmentCompany.id, { onDelete: 'cascade' }),
    code: text('code'),
    name: text('name'),
    type: text('type').notNull().default('standard'), // 'standard' or 'local'
    classification: text('classification'), // Only for local activities
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
)

export const enrichmentCompanyOfficer = pgTable('enrichment_company_officer', {
  id: uuid('id').defaultRandom().primaryKey(),
  company_id: uuid('company_id')
    .notNull()
    .references(() => enrichmentCompany.id, { onDelete: 'cascade' }),
  type: text('type'), // 'physical' or 'legal'
  role: text('role'),
  mention: text('mention'),
  date_of_appointment: timestamp('date_of_appointment'),

  // Personal information (for physical persons)
  last_name: text('last_name'),
  first_name: text('first_name'),
  gender: text('gender'),
  date_of_birth: timestamp('date_of_birth'),
  date_of_birth_format: text('date_of_birth_format'),
  nationality: text('nationality'),
  nationality_code: text('nationality_code'),

  // Company information (for legal persons)
  company_name: text('company_name'),
  company_number: text('company_number'),

  // Address information
  address_line_1: text('address_line_1'),
  address_line_2: text('address_line_2'),
  postal_code: text('postal_code'),
  city: text('city'),
  country: text('country'),
  country_code: text('country_code'),

  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const enrichmentCompanyUbo = pgTable('enrichment_company_ubo', {
  id: uuid('id').defaultRandom().primaryKey(),
  company_id: uuid('company_id')
    .notNull()
    .references(() => enrichmentCompany.id, { onDelete: 'cascade' }),

  // Personal information
  last_name: text('last_name'),
  first_name: text('first_name'),
  gender: text('gender'),
  date_of_birth: timestamp('date_of_birth'),
  date_of_birth_format: text('date_of_birth_format'),
  nationality: text('nationality'),
  nationality_code: text('nationality_code'),

  // Address information
  address_line_1: text('address_line_1'),
  address_line_2: text('address_line_2'),
  postal_code: text('postal_code'),
  city: text('city'),
  country: text('country'),
  country_code: text('country_code'),

  // Ownership information
  percentage_of_shares: text('percentage_of_shares'),
  voting_percentage: text('voting_percentage'),

  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const enrichmentCompanyContact = pgTable('enrichment_company_contact', {
  id: uuid('id').defaultRandom().primaryKey(),
  company_id: uuid('company_id')
    .notNull()
    .references(() => enrichmentCompany.id, { onDelete: 'cascade' }),
  type: text('type'), // e.g., 'phone', 'email', 'website'
  value: text('value').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const enrichmentCompanyEstablishment = pgTable(
  'enrichment_company_establishment',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    company_id: uuid('company_id')
      .notNull()
      .references(() => enrichmentCompany.id, { onDelete: 'cascade' }),
    number: text('number'),
    name: text('name'),
    trade_name: text('trade_name'),
    acronym: text('acronym'),
    fields_of_activity: text('fields_of_activity'),
    date_of_creation: timestamp('date_of_creation'),
    status: text('status'),
    date_of_cessation: timestamp('date_of_cessation'),

    // Address information
    address_line_1: text('address_line_1'),
    address_line_2: text('address_line_2'),
    postal_code: text('postal_code'),
    city: text('city'),
    country: text('country'),
    country_code: text('country_code'),

    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
)

export const enrichmentCompanyFinancial = pgTable(
  'enrichment_company_financial',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    company_id: uuid('company_id')
      .notNull()
      .references(() => enrichmentCompany.id, { onDelete: 'cascade' }),
    type: text('type'),
    financials_start_date: timestamp('financials_start_date'),
    financials_end_date: timestamp('financials_end_date'),
    deposit_date: timestamp('deposit_date'),
    currency: text('currency'),
    availability: text('availability'),
    ratios: jsonb('ratios').$type<FinancialRatios | null>(),
    related_documents: jsonb('related_documents').$type<
      RelatedDocument[] | null
    >(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
)

// Type exports
export type EnrichmentCompany = typeof enrichmentCompany.$inferSelect
export type EnrichmentCompanyActivity =
  typeof enrichmentCompanyActivity.$inferSelect
export type EnrichmentCompanyOfficer =
  typeof enrichmentCompanyOfficer.$inferSelect
export type EnrichmentCompanyUbo = typeof enrichmentCompanyUbo.$inferSelect
export type EnrichmentCompanyContact =
  typeof enrichmentCompanyContact.$inferSelect
export type EnrichmentCompanyEstablishment =
  typeof enrichmentCompanyEstablishment.$inferSelect
