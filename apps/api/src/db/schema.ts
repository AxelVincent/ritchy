import {
  CompanyFieldEnum,
  ContactFieldEnum,
  SocialMediaPlatformEnum,
  StatusFieldEnum,
} from '@ritchy/types'
import { type InferSelectModel, sql } from 'drizzle-orm'
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

export const user = pgTable(
  'user',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    clerkId: text('clerk_id').notNull().unique(),
    email: text('email').notNull().unique(),
    firstName: text('first_name'),
    lastName: text('last_name'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    uniqClerkId: uniqueIndex('uniq_clerk_id').on(table.clerkId),
  }),
)

export const list = pgTable('list', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  emoji: text('emoji').notNull(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const listPlace = pgTable(
  'list_place',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    listId: uuid('list_id')
      .notNull()
      .references(() => list.id, { onDelete: 'cascade' }),
    placeId: text('place_id').notNull(),
    searchId: uuid('search_id').references(() => search.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    uniqListPlace: uniqueIndex('uniq_list_place').on(
      table.listId,
      table.placeId,
    ),
    listIdIdx: index('idx_list_place_list_id').on(table.listId),
  }),
)

export const note = pgTable(
  'note',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    placeId: text('place_id').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    note: text('note').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    placeIdIdx: index('idx_note_place_id').on(table.placeId),
    userIdIdx: index('idx_note_user_id').on(table.userId),
    placeUserIdx: index('idx_note_place_user').on(table.placeId, table.userId),
  }),
)

export const searchModelEnum = pgEnum('search_model', [
  'ESSENTIALS',
  'NAVIGATOR',
  'EXPLORER',
  'PRO',
])

export const search = pgTable('search', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  placeName: text('place_name').notNull(),
  keyword: text('keyword').notNull(),
  model: searchModelEnum('model').notNull(),
  rectangle: jsonb('rectangle').notNull().$type<{
    northEast: { latitude: number; longitude: number }
    southWest: { latitude: number; longitude: number }
  }>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const webhookServiceEnum = pgEnum('webhook_service', [
  'clerk',
  'stripe',
  'hubspot',
])

export const webhookEvent = pgTable(
  'webhook_event',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    idempotencyKey: text('idempotency_key').notNull().unique(),
    type: text('type').notNull(),
    service: webhookServiceEnum('service').notNull(),
    payload: jsonb('payload').notNull(),
    processedAt: timestamp('processed_at').notNull().defaultNow(),
    status: text('status')
      .notNull()
      .default('processed')
      .$type<'processed' | 'failed'>(),
    error: text('error'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    uniqIdempotencyKey: uniqueIndex('uniq_idempotency_key').on(
      table.idempotencyKey,
    ),
  }),
)

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'incomplete', // Payment failed during subscription creation
  'incomplete_expired', // Initial payment failed and subscription expired
  'trialing', // Currently in trial period
  'active', // Subscription is active and paid
  'past_due', // Payment failed for an active subscription
  'canceled', // Subscription has been canceled
  'unpaid', // Payment failed and subscription entered dunning
  'paused', // Subscription is paused (if pause feature enabled)
])

export const subscriptionPlanEnum = pgEnum('subscription_plan', [
  'FREE',
  'ESSENTIALS',
  'EXPLORER',
  'NAVIGATOR',
  'PRO',
])

export const subscription = pgTable(
  'subscription',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' })
      .unique(),
    stripeSubscriptionId: text('stripe_subscription_id').notNull().unique(),
    stripePriceId: text('stripe_price_id').notNull(),
    stripeCustomerId: text('stripe_customer_id').notNull(),
    status: subscriptionStatusEnum('status').notNull().default('incomplete'),
    plan: subscriptionPlanEnum('plan').notNull().default('FREE'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    uniqStripeSubId: uniqueIndex('uniq_stripe_subscription_id').on(
      table.stripeSubscriptionId,
    ),
    uniqStripeCustomerId: uniqueIndex('uniq_stripe_customer_id').on(
      table.stripeCustomerId,
    ),
    uniqUserId: uniqueIndex('uniq_user_id').on(table.userId),
  }),
)

export const enrichment = pgTable(
  'enrichment',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    placeId: text('place_id').notNull(),
    website: text('website').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    uniqUserPlace: uniqueIndex('uniq_user_place').on(
      table.userId,
      table.placeId,
    ),
  }),
)

export const leadStatusEnum = pgEnum('lead_status', [
  'NEW',
  'NO_ANSWER',
  'CONTACTED',
  'FOLLOW_UP',
  'MEETING',
  'INTERESTED',
  'WON',
  'LOST',
])

export const status = pgTable(
  'status',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    placeId: text('place_id').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    status: leadStatusEnum('status').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    uniqUserPlace: uniqueIndex('uniq_user_place_status').on(
      table.userId,
      table.placeId,
    ),
    placeUserIdx: index('idx_place_user_status').on(
      table.placeId,
      table.userId,
    ),
  }),
)

export const contact = pgTable(
  'contact',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    placeId: text('place_id').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    firstname: text('firstname'),
    lastname: text('lastname'),
    email: text('email'),
    phone: text('phone'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    uniqUserPlace: uniqueIndex('uniq_user_place_contact').on(
      table.userId,
      table.placeId,
    ),
  }),
)

export type Contact = InferSelectModel<typeof contact>

export const userDemoCode = pgTable(
  'user_demo_code',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' })
      .unique(),
    code: text('code').notNull(),
    isValidated: boolean('is_validated').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    validatedAt: timestamp('validated_at'),
  },
  (table) => ({
    userIdx: index('idx_user_demo_code_user_id').on(table.userId),
    codeIdx: index('idx_user_demo_code_code').on(table.code),
  }),
)

export const hubspotToken = pgTable(
  'hubspot_token',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' })
      .unique(),
    accessToken: text('access_token').notNull(),
    refreshToken: text('refresh_token').notNull(),
    portalId: text('portal_id'),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    uniqUserId: uniqueIndex('uniq_user_id_hubspot_token').on(table.userId),
    portalIdIdx: index('idx_hubspot_token_portal_id').on(table.portalId),
  }),
)

// Update the enum to include status fields
export const internalFieldEnum = pgEnum('internal_field', [
  ...CompanyFieldEnum.options,
  ...ContactFieldEnum.options,
  ...StatusFieldEnum.options,
])

export const hubspotFieldMapping = pgTable(
  'hubspot_field_mapping',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tokenId: uuid('token_id')
      .notNull()
      .references(() => hubspotToken.id, { onDelete: 'cascade' }),
    internalField: internalFieldEnum('internal_field').notNull(),
    hubspotField: text('hubspot_field').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    uniqTokenField: uniqueIndex('uniq_token_field_mapping').on(
      table.tokenId,
      table.internalField,
    ),
    tokenIdIdx: index('idx_hubspot_field_mapping_token_id').on(table.tokenId),
  }),
)

export const hubspotLeadMapping = pgTable(
  'hubspot_lead_mapping',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    placeId: text('place_id').notNull(),
    hubspotCompanyId: text('hubspot_company_id').notNull(),
    hubspotContactId: text('hubspot_contact_id'),
    tokenId: uuid('token_id')
      .notNull()
      .references(() => hubspotToken.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    uniqPlaceLead: uniqueIndex('uniq_place_lead').on(
      table.placeId,
      table.tokenId,
    ),
    placeIdIdx: index('idx_hubspot_lead_place_id').on(table.placeId),
    companyIdIdx: index('idx_hubspot_lead_company_id').on(
      table.hubspotCompanyId,
    ),
    contactIdIdx: index('idx_hubspot_lead_contact_id').on(
      table.hubspotContactId,
    ),
    tokenIdIdx: index('idx_hubspot_lead_token_id').on(table.tokenId),
  }),
)

export type VersionOperation = 'INSERT' | 'UPDATE' | 'DELETE' | 'ROLLBACK'

export type VersionMetadata = {
  // Request context
  ipAddress?: string
  userAgent?: string
  requestId?: string
  // Operation context
  reason?: string
  changedFields?: string[]
  deletedAt?: Date
  // Bulk operation context
  bulkOperationId?: string
  bulkOperationType?: 'INSERT' | 'UPDATE' | 'DELETE'
  affectedRecords?: string[]
  // Rollback context
  rollbackFromVersion?: number
}

// Then define the table
export const versionHistory = pgTable(
  'version_history',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tableName: text('table_name').notNull(),
    recordId: uuid('record_id').notNull(),
    version: integer('version').notNull(),
    currentState: jsonb('current_state').notNull(),
    previousState: jsonb('previous_state'),
    userId: uuid('user_id').references(() => user.id, { onDelete: 'set null' }),
    operation: text('operation').notNull().$type<VersionOperation>(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    metadata: jsonb('metadata').$type<VersionMetadata>(),
  },
  (table) => ({
    // Existing indexes
    uniqRecordVersion: uniqueIndex('uniq_record_version').on(
      table.tableName,
      table.recordId,
      table.version,
    ),
    tableRecordIdx: index('idx_version_history_table_record').on(
      table.tableName,
      table.recordId,
    ),
    userIdIdx: index('idx_version_history_user_id').on(table.userId),
    createdAtIdx: index('idx_version_history_created_at').on(table.createdAt),
    versionCheck: check('version_positive', sql`${table.version} > 0`),
    operationCheck: check(
      'valid_operation',
      sql`${table.operation} IN ('INSERT', 'UPDATE', 'DELETE', 'ROLLBACK')`,
    ),
  }),
)

export const contactEmail = pgTable(
  'contact_email',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contact.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    isPrimary: boolean('is_primary').notNull().default(false),
    emailType: text('email_type'),
    source: text('source'), // 'enrichment', 'manual', 'third_party'
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    // Unique primary email per contact
    primaryContactEmail: uniqueIndex('idx_contact_email_primary')
      .on(table.contactId)
      .where(sql`${table.isPrimary} = true`),

    // Index for queries by contact_id
    contactIdx: index('idx_contact_email_contact_id').on(table.contactId),

    // Index for email lookups
    emailIdx: index('idx_contact_email_email').on(table.email),

    // Composite index for contact_id and email
    contactEmailIdx: index('idx_contact_email_contact_id_email').on(
      table.contactId,
      table.email,
    ),
  }),
)

export const socialPlatformEnum = pgEnum(
  'social_platform',
  SocialMediaPlatformEnum.options,
)

export const contactSocial = pgTable(
  'contact_social',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contact.id, { onDelete: 'cascade' }),
    platform: socialPlatformEnum('platform').notNull(),
    profileUrl: text('profile_url').notNull(),
    username: text('username'), // extracted from profileUrl
    isPrimary: boolean('is_primary').notNull().default(false),
    source: text('source'), // 'enrichment', 'manual', 'third_party'
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    // Unique primary social per platform per contact
    primaryContactSocial: uniqueIndex('idx_contact_social_primary')
      .on(table.contactId, table.platform)
      .where(sql`${table.isPrimary} = true`),

    // Index for queries by contact_id
    contactIdx: index('idx_contact_social_contact_id').on(table.contactId),

    // Index for platform lookups
    platformIdx: index('idx_contact_social_platform').on(table.platform),

    // Composite index for contact_id and platform
    contactPlatformIdx: index('idx_contact_social_contact_id_platform').on(
      table.contactId,
      table.platform,
    ),

    urlIdx: index('idx_contact_social_url').on(table.profileUrl),
  }),
)
