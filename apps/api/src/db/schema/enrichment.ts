import { timestamp, text, uniqueIndex } from 'drizzle-orm/pg-core'
import { pgTable, uuid } from 'drizzle-orm/pg-core'
import { place } from './place'
import { phoneTypeEnum } from './enum'

export const enrichment = pgTable('enrichment', {
  id: uuid('id').defaultRandom().primaryKey(),
  placeId: uuid('place_id')
    .notNull()
    .references(() => place.id, { onDelete: 'cascade' })
    .unique(),
  domain: text('domain').notNull(),
  domainRegisteredAt: timestamp('domain_registered_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
})

export const enrichmentFacebook = pgTable('enrichment_facebook', {
  id: uuid('id').defaultRandom().primaryKey(),
  enrichmentId: uuid('enrichment_id')
    .notNull()
    .references(() => enrichment.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
})

export const enrichmentInstagram = pgTable('enrichment_instagram', {
  id: uuid('id').defaultRandom().primaryKey(),
  enrichmentId: uuid('enrichment_id')
    .notNull()
    .references(() => enrichment.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
})

export const enrichmentLinkedin = pgTable('enrichment_linkedin', {
  id: uuid('id').defaultRandom().primaryKey(),
  enrichmentId: uuid('enrichment_id')
    .notNull()
    .references(() => enrichment.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
})

export const enrichmentEmail = pgTable('enrichment_email', {
  id: uuid('id').defaultRandom().primaryKey(),
  enrichmentId: uuid('enrichment_id')
    .notNull()
    .references(() => enrichment.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
})

export const enrichmentPhone = pgTable('enrichment_phone', {
  id: uuid('id').defaultRandom().primaryKey(),
  enrichmentId: uuid('enrichment_id')
    .notNull()
    .references(() => enrichment.id, { onDelete: 'cascade' }),
  phone: text('phone').notNull(),
  type: phoneTypeEnum('type').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
})
