import { type InferSelectModel, sql } from 'drizzle-orm'
import {
  boolean,
  check,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

import { socialPlatformEnum } from './enum'
import { userPlace } from './place'

export const contact = pgTable(
  'contact',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userPlaceId: uuid('user_place_id')
      .notNull()
      .references(() => userPlace.id, { onDelete: 'cascade' }),
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
  ],
)

export type Contact = InferSelectModel<typeof contact>

export const contactEmail = pgTable('contact_email', {
  id: uuid('id').defaultRandom().primaryKey(),
  contactId: uuid('contact_id')
    .notNull()
    .references(() => contact.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  isPrimary: boolean('is_primary').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const contactSocialMedia = pgTable('contact_social_media', {
  id: uuid('id').defaultRandom().primaryKey(),
  contactId: uuid('contact_id')
    .notNull()
    .references(() => contact.id, { onDelete: 'cascade' }),
  socialMediaPlatform: socialPlatformEnum('social_media_platform').notNull(),
  url: text('url').notNull(),
  isPrimary: boolean('is_primary').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

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

export const contactPhone = pgTable('contact_phone', {
  id: uuid('id').defaultRandom().primaryKey(),
  contactId: uuid('contact_id')
    .notNull()
    .references(() => contact.id, { onDelete: 'cascade' }),
  phone: text('phone').notNull(),
  type: phoneTypeEnum('type').notNull(),
  isPrimary: boolean('is_primary').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
