import {
  pgTable,
  serial,
  text,
  timestamp,
  doublePrecision,
  integer
} from 'drizzle-orm/pg-core'

export const queryParam = pgTable('query_param', {
  id: serial('id').primaryKey(),
  researchQuery: text('research_query').notNull(),
  latitude: doublePrecision('latitude').notNull(),
  longitude: doublePrecision('longitude').notNull(),
  zoom: text('zoom').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
})

export const lead = pgTable('lead', {
  id: serial('id').primaryKey(),
  queryParamId: integer('query_param_id')
    .notNull()
    .references(() => queryParam.id),
  name: text('name').notNull(),
  address: text('address').notNull(),
  phone: text('phone'),
  website: text('website'),
  latitude: doublePrecision('latitude').notNull(),
  longitude: doublePrecision('longitude').notNull(),
  email: text('email'),
  description: text('description'),
  websiteContent: text('website_content'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
})
