import { boolean, text, timestamp, unique } from 'drizzle-orm/pg-core'
import { pgTable, uuid } from 'drizzle-orm/pg-core'
import { emailQualityEnum, emailResultEnum, phoneTypeEnum } from './enum'
import { place } from './place'

export const enrichment = pgTable('enrichment', {
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
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

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
