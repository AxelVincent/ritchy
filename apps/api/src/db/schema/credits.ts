import { sql } from 'drizzle-orm'
import { check, integer, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core'
import { user } from './user'

export const credits = pgTable(
  'credits',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' })
      .unique(),
    enrichment: integer('enrichment').notNull().default(0),
    search: integer('search').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  () => [
    check('enrichment_credit_check', sql`enrichment >= 0`),
    check('search_credit_check', sql`search >= 0`),
  ],
)
