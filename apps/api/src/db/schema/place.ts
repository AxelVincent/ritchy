import {
  boolean,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { pgTable, uuid } from 'drizzle-orm/pg-core'
import { placeSourceEnum } from './enum'
import { user } from './user'

export const place = pgTable('place', {
  id: uuid('id').defaultRandom().primaryKey(),
  source: placeSourceEnum('source').notNull(),
  sourceId: text('source_id').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const userPlace = pgTable(
  'user_place',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    placeId: uuid('place_id')
      .notNull()
      .references(() => place.id, { onDelete: 'cascade' }),
    enrichedAt: timestamp('enriched_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uniq_user_place').on(table.userId, table.placeId),
    unique().on(table.placeId, table.userId),
  ],
)
