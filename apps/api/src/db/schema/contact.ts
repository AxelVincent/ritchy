import { type InferSelectModel, sql } from 'drizzle-orm'
import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

import { enrichmentCompanyOfficer } from './enrichment'
import {
  contactTypeEnum,
  emailQualityEnum,
  emailResultEnum,
  socialPlatformEnum,
} from './enum'
import { userPlace } from './place'

export const contact = pgTable(
  'contact',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userPlaceId: uuid('user_place_id')
      .notNull()
      .references(() => userPlace.id, { onDelete: 'cascade' }),
    officerId: uuid('officer_id').references(
      () => enrichmentCompanyOfficer.id,
      { onDelete: 'cascade' },
    ),
    type: contactTypeEnum('type'),
    firstName: text('first_name'),
    lastName: text('last_name'),
    isPrimary: boolean('is_primary').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('one_primary_per_place')
      .on(table.userPlaceId)
      .where(sql`${table.isPrimary} = true`),
    index('idx_contact_user_place_id').on(table.userPlaceId),
  ],
)

export type Contact = InferSelectModel<typeof contact>

export const contactEmail = pgTable(
  'contact_email',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    contact_id: uuid('contact_id')
      .notNull()
      .references(() => contact.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    is_primary: boolean('is_primary').notNull().default(false),
    is_verified: boolean('is_verified').notNull().default(false),
    source: text('source'),
    quality: emailQualityEnum('quality'),
    result: emailResultEnum('result'),
    role: boolean('role').notNull().default(false),
    free: boolean('free').notNull().default(false),
    created_at: timestamp('created_at').notNull().defaultNow(),
    updated_at: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    unique().on(table.contact_id, table.email),
    uniqueIndex('one_primary_email_per_contact')
      .on(table.contact_id)
      .where(sql`${table.is_primary} = true`),
    index('idx_contact_email_contact_id').on(table.contact_id),
  ],
)
export type ContactEmail = typeof contactEmail.$inferSelect

export const contactSocialMedia = pgTable(
  'contact_social_media',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contact.id, { onDelete: 'cascade' }),
    socialMediaPlatform: socialPlatformEnum('social_media_platform').notNull(),
    url: text('url').notNull(),
    isPrimary: boolean('is_primary').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    unique().on(table.contactId, table.socialMediaPlatform, table.url),
    uniqueIndex('one_primary_social_media_per_contact')
      .on(table.contactId)
      .where(sql`${table.isPrimary} = true`),
    index('idx_contact_social_media_contact_id').on(table.contactId),
  ],
)

export const phoneTypeEnum = pgEnum('phone_type', [
  'PREMIUM_RATE',
  'TOLL_FREE',
  'SHARED_COST',
  'VOIP',
  'PERSONAL_NUMBER',
  'PAGER',
  'UAN',
  'VOICEMAIL',
  'FIXED_LINE_OR_MOBILE',
  'FIXED_LINE',
  'MOBILE',
])

export const contactPhone = pgTable(
  'contact_phone',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contact.id, { onDelete: 'cascade' }),
    phone: text('phone').notNull(),
    type: phoneTypeEnum('type').notNull(),
    isPrimary: boolean('is_primary').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    unique().on(table.contactId, table.phone, table.type),
    uniqueIndex('one_primary_phone_per_contact')
      .on(table.contactId)
      .where(sql`${table.isPrimary} = true`),
    index('idx_contact_phone_contact_id').on(table.contactId),
  ],
)
